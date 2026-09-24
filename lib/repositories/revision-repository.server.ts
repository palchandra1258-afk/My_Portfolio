// Content revisions — Phase 10.
//
// DATABASE_DESIGN.md §20, CMS_SPECIFICATION.md §47–49,
// IMPLEMENTATION_ROADMAP.md §52–54.
//
// ── What this is, and what it is not ───────────────────────────────────────
// A revision records *what the content looked like* at a moment. An audit
// entry records *that an action happened*. DATABASE_DESIGN.md §21 is explicit
// that collapsing the two makes both useless, so this module does only the
// former; the audit log is Phase 11.
//
// ── Administrative history, never public ──────────────────────────────────
// Nothing in app/projects/*, the sitemap, or any metadata function reads this
// table. Snapshots contain the full project INCLUDING the admin-only
// verification notes, so exposing one publicly would undo Phase 8's work in a
// single step. Every read here is called only from an admin route that has
// already established the session.
//
// ── Snapshots, not diffs ──────────────────────────────────────────────────
// §20: a diff turns restore into a replay engine, while a snapshot makes
// restore a straight copy. The snapshot is produced by the *same*
// reconstruction the application and `db:verify` use
// (`readProjectsFromDatabase`), so a revision can never record a shape the app
// does not actually serve.

import "server-only";

import { prisma } from "@/lib/db";
import { readProjectsFromDatabase } from "@/lib/repositories/read-model";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { ContentOrigin, PublicationStatus } from "@/lib/generated/prisma/enums";
import type { Project } from "@/lib/types";

/** The transactional client Prisma hands to a `$transaction` callback. */
type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/** Only `project` exists today; the column is a vocabulary so `profile` can join later. */
export const PROJECT_ENTITY = "project" as const;

/**
 * A full, self-contained copy of a project at one moment.
 *
 * `project` carries the content and every child collection. The four fields
 * beside it are the row-level state the domain type does not model but that a
 * faithful restore needs.
 *
 * `publishedAt` is an ISO string rather than a Date because this is stored as
 * JSON — a Date would come back as a string anyway, and saying so in the type
 * stops a caller assuming otherwise.
 */
export interface ProjectSnapshot {
  project: Project;
  displayOrder: number;
  publicationStatus: PublicationStatus;
  publishedAt: string | null;
  contentOrigin: ContentOrigin;
}

/** One row of history, as the admin screens consume it. */
export interface ProjectRevision {
  id: number;
  versionNumber: number;
  publicationStatusAtRevision: PublicationStatus;
  changeSummary: string | null;
  createdBy: string | null;
  createdAt: Date;
  snapshot: ProjectSnapshot;
}

/** Metadata about a change, supplied by the server action that caused it. */
export interface RevisionContext {
  /**
   * Session subject of the administrator responsible.
   *
   * §20 leaves `created_by` as a nullable placeholder for a future `users`
   * table. Until that exists this holds the real session subject — never a
   * fabricated author, and never a default like "system" that would imply an
   * actor who does not exist.
   */
  actor?: string;
  /** Short description of what happened, e.g. "Published". */
  summary?: string;
}

/**
 * Take a snapshot of one project as it stands right now.
 *
 * Reads through the shared reconstruction rather than serializing the Prisma
 * row directly, so what is stored is exactly what the app would render.
 */
async function snapshotProject(tx: Tx, projectId: number): Promise<ProjectSnapshot> {
  const [project] = await readProjectsFromDatabase(tx as never, { projectId });
  if (project === undefined) {
    // Only reachable if the row vanished between the write and this read
    // inside one transaction, which cannot happen — but silently writing a
    // half-empty snapshot would be worse than failing.
    throw new Error(`Cannot snapshot project ${projectId}: no such row in this transaction.`);
  }

  const row = await tx.project.findUniqueOrThrow({
    where: { id: projectId },
    select: {
      displayOrder: true,
      publicationStatus: true,
      publishedAt: true,
      contentOrigin: true,
    },
  });

  return {
    project,
    displayOrder: row.displayOrder,
    publicationStatus: row.publicationStatus,
    publishedAt: row.publishedAt === null ? null : row.publishedAt.toISOString(),
    contentOrigin: row.contentOrigin,
  };
}

/**
 * Record a revision for a project, inside the caller's transaction.
 *
 * ── Why it must share the caller's transaction ────────────────────────────
 * The snapshot has to be of the content the write just produced, and it has to
 * disappear if that write is rolled back. Both follow from using the same `tx`
 * handle: there is no window in which a revision exists for content that was
 * never committed, and none in which committed content has no revision.
 *
 * ── Version numbering ─────────────────────────────────────────────────────
 * `max(version_number) + 1` for this entity. Computed rather than counted, so
 * a future hard delete of one revision cannot cause a number to be reused. The
 * unique index on `(entity_type, entity_id, version_number)` is what makes the
 * read-then-write safe: two concurrent transactions that both compute the same
 * next number collide, and the loser's whole write is rolled back rather than
 * silently producing a second version 4.
 */
export async function recordProjectRevisionWithin(
  tx: Tx,
  projectId: number,
  context: RevisionContext = {},
): Promise<ProjectRevision> {
  const snapshot = await snapshotProject(tx, projectId);

  const latest = await tx.contentRevision.findFirst({
    where: { entityType: PROJECT_ENTITY, entityId: projectId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });

  const row = await tx.contentRevision.create({
    data: {
      entityType: PROJECT_ENTITY,
      entityId: projectId,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      // Prisma's Json input type does not accept an arbitrary interface, and
      // the value genuinely is plain JSON-serializable data.
      snapshot: snapshot as unknown as object,
      publicationStatusAtRevision: snapshot.publicationStatus,
      changeSummary: context.summary ?? null,
      createdBy: context.actor ?? null,
    },
    select: {
      id: true,
      versionNumber: true,
      publicationStatusAtRevision: true,
      changeSummary: true,
      createdBy: true,
      createdAt: true,
    },
  });

  return { ...row, snapshot };
}

// ---------------------------------------------------------------------------
// Reads — admin only
// ---------------------------------------------------------------------------

/** Summary row for the history list; excludes the snapshot blob. */
export interface ProjectRevisionSummary {
  id: number;
  versionNumber: number;
  publicationStatusAtRevision: PublicationStatus;
  changeSummary: string | null;
  createdBy: string | null;
  createdAt: Date;
}

/**
 * A project's history, newest first.
 *
 * Deliberately does not select `snapshot`: a list of thirteen snapshots would
 * move a large amount of admin-only content into a page that only needs to
 * show dates and summaries.
 */
export async function listProjectRevisions(
  projectId: number,
  client: Tx | PrismaClient = prisma,
): Promise<ProjectRevisionSummary[]> {
  return client.contentRevision.findMany({
    where: { entityType: PROJECT_ENTITY, entityId: projectId },
    orderBy: { versionNumber: "desc" },
    select: {
      id: true,
      versionNumber: true,
      publicationStatusAtRevision: true,
      changeSummary: true,
      createdBy: true,
      createdAt: true,
    },
  });
}

/**
 * One revision in full, including its snapshot.
 *
 * Takes the project id as well as the revision id and requires both to match,
 * so a guessed id cannot pull up history belonging to a different project.
 */
export async function getProjectRevision(
  projectId: number,
  revisionId: number,
  client: Tx | PrismaClient = prisma,
): Promise<ProjectRevision | null> {
  const row = await client.contentRevision.findFirst({
    where: { id: revisionId, entityType: PROJECT_ENTITY, entityId: projectId },
  });
  if (row === null) return null;

  return {
    id: row.id,
    versionNumber: row.versionNumber,
    publicationStatusAtRevision: row.publicationStatusAtRevision,
    changeSummary: row.changeSummary,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    snapshot: row.snapshot as unknown as ProjectSnapshot,
  };
}
