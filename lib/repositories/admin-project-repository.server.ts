// Database-backed project writes for the CMS — Phase 7.
//
// The only module in the project that writes project content. Everything else
// reads. It is `server-only`, and every function here assumes the caller has
// already established that the request is the administrator's — authorization
// lives in the server actions, not in the data layer, so it cannot be
// bypassed by calling a repository function directly from somewhere new.
//
// ── Why the admin reads from PostgreSQL unconditionally ────────────────────
// The public read path honours CONTENT_SOURCE. This one cannot: a form cannot
// edit content/projects.ts, so the CMS necessarily operates on the database
// whatever the public site happens to be reading. That is a real and visible
// gap while CONTENT_SOURCE=typescript, and the admin UI says so on every
// project screen rather than letting an edit look like it went live.
//
// ── What an edit is allowed to touch ───────────────────────────────────────
// The Phase 7 editor owns identity, classification, the summary, evidence,
// links, ordering, publication state and technologies. It owns nothing else.
// `updateProject` writes exactly those columns and the technology join rows.
//
// It never touches:
//   problem · approach · architecture
//   project_metrics · project_content_list_items (results / whatIsWorking /
//   whatIsInDevelopment) · project_implementation_notes ·
//   project_alternate_names · project_relationships
//
// That is deliberate and load-bearing. Those tables hold the evidence-graded
// material — metrics carrying `verified-result` vs `target`, and the
// [NEEDS INFORMATION] / [NEEDS VERIFICATION] markers awaiting the owner's
// facts. A "replace all children" update of the kind scripts/db/import.ts
// performs would erase every one of them on the first save from a form that
// does not collect them. Editing them comes with the section editor in a later
// phase; until then they are preserved by not being written.
//
// ── Transactions ───────────────────────────────────────────────────────────
// A create or update spans `projects`, `technologies` and
// `project_technologies`. Each runs inside one interactive transaction, so a
// failure part-way cannot leave a project row pointing at half its
// technologies. The `*Within` variants take the transaction handle, which is
// also what lets the integration tests run a full create/update and roll it
// back, writing nothing.

import "server-only";

import { prisma } from "@/lib/db";
import {
  CATEGORY_MAP,
  EVIDENCE_MAP,
  STATUS_MAP,
} from "@/lib/content/schema-maps";
import {
  CATEGORY_FROM_DB,
  EVIDENCE_FROM_DB,
  STATUS_FROM_DB,
  readProjectsFromDatabase,
} from "@/lib/repositories/read-model";
import { parseSnapshotForRestore } from "@/lib/admin/restore";
import type { ProjectFieldErrors, ProjectFormValues } from "@/lib/admin/project-form";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { ContentOrigin, PublicationStatus } from "@/lib/generated/prisma/enums";
import {
  getProjectRevision,
  recordProjectRevisionWithin,
  type RevisionContext,
} from "@/lib/repositories/revision-repository.server";
import type { Project } from "@/lib/types";

/** The interactive-transaction client Prisma hands to a `$transaction` callback. */
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/** A slug collided with an existing project. Carries the slug, never a query. */
export class DuplicateSlugError extends Error {
  constructor(public readonly slug: string) {
    super(`A project with the slug "${slug}" already exists.`);
    this.name = "DuplicateSlugError";
  }
}

/** The project being edited no longer exists. */
export class ProjectNotFoundError extends Error {
  constructor(public readonly slug: string) {
    super(`No project with the slug "${slug}".`);
    this.name = "ProjectNotFoundError";
  }
}

/**
 * No such revision *for this project*.
 *
 * Deliberately does not distinguish "does not exist" from "belongs to another
 * project": both are the same answer to a caller who is not entitled to the
 * difference, and telling them apart would confirm the existence of history on
 * a project the URL did not name.
 */
export class RevisionNotFoundError extends Error {
  constructor(
    public readonly slug: string,
    public readonly revisionId: number,
  ) {
    super(`No revision ${revisionId} for the project "${slug}".`);
    this.name = "RevisionNotFoundError";
  }
}

/**
 * A stored snapshot did not pass the editor's own validation.
 *
 * Carries the field errors so the screen can say *which* part of the old
 * content is no longer acceptable, rather than refusing the restore with no
 * explanation. Nothing is written when this is thrown.
 */
export class InvalidRevisionError extends Error {
  constructor(public readonly errors: ProjectFieldErrors) {
    super("The stored revision did not pass validation.");
    this.name = "InvalidRevisionError";
  }
}

/** Prisma's unique-constraint violation. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

// ---------------------------------------------------------------------------
// Reads (admin view — includes drafts)
// ---------------------------------------------------------------------------

export interface AdminProjectRow {
  id: number;
  slug: string;
  title: string;
  category: string;
  status: string;
  featured: boolean;
  publicationStatus: PublicationStatus;
  contentOrigin: ContentOrigin;
  displayOrder: number;
  updatedAt: Date;
  /** When the project first went live. Null until it has ever been published. */
  publishedAt: Date | null;
  technologyCount: number;
}

/**
 * Every project, drafts included, in display order.
 *
 * No publication filter — the admin exists precisely to see what the public
 * cannot (CMS_SPECIFICATION.md §43).
 */
export async function listProjectsForAdmin(client: Tx | PrismaClient = prisma): Promise<AdminProjectRow[]> {
  const rows = await client.project.findMany({
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      status: true,
      featured: true,
      publicationStatus: true,
      contentOrigin: true,
      displayOrder: true,
      updatedAt: true,
      publishedAt: true,
      _count: { select: { technologies: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    status: row.status,
    featured: row.featured,
    publicationStatus: row.publicationStatus,
    contentOrigin: row.contentOrigin,
    displayOrder: row.displayOrder,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
    technologyCount: row._count.technologies,
  }));
}

export interface EditableProject {
  /** Primary key — needed to look up this project's revision history. */
  id: number;
  values: ProjectFormValues;
  contentOrigin: ContentOrigin;
  updatedAt: Date;
  /** Child rows this editor does not manage, so the UI can say what it is protecting. */
  preserved: {
    metrics: number;
    contentListItems: number;
    implementationNotes: number;
    alternateNames: number;
    relationships: number;
  };
}

/** One project in the shape the edit form expects, or null when the slug is unknown. */
export async function getProjectForEdit(
  slug: string,
  client: Tx | PrismaClient = prisma,
): Promise<EditableProject | null> {
  const row = await client.project.findUnique({
    where: { slug },
    include: {
      technologies: {
        orderBy: { displayOrder: "asc" },
        include: { technology: { select: { name: true } } },
      },
      _count: {
        select: {
          metrics: true,
          contentListItems: true,
          implementationNotes: true,
          alternateNames: true,
          relationshipsAsSource: true,
        },
      },
    },
  });
  if (row === null) return null;

  // Three of these enums are @map-ed in the schema, and Prisma returns the
  // CLIENT member name, not the mapped database spelling — `self_reported`,
  // not `self-reported`. Casting instead of translating would hand the form a
  // value none of its <option>s match; the browser would then silently select
  // the first option, and saving would rewrite the project's evidence status
  // to something nobody chose. Translated through the same inverse maps the
  // public read path and db:verify use, so all three agree by construction.
  //
  // `source` and `publicationStatus` carry no @map, so they pass through.
  return {
    id: row.id,
    values: {
      slug: row.slug,
      title: row.title,
      category: CATEGORY_FROM_DB[row.category],
      status: STATUS_FROM_DB[row.status],
      source: row.source as ProjectFormValues["source"],
      featured: row.featured,
      shortDescription: row.shortDescription,
      evidenceStatus: EVIDENCE_FROM_DB[row.evidenceStatus],
      verificationNotes: row.verificationNotes,
      technologies: row.technologies.map((t) => t.technology.name),
      githubUrl: row.githubUrl,
      demoUrl: row.demoUrl,
      displayOrder: row.displayOrder,
      publicationStatus: row.publicationStatus,
    },
    contentOrigin: row.contentOrigin,
    updatedAt: row.updatedAt,
    preserved: {
      metrics: row._count.metrics,
      contentListItems: row._count.contentListItems,
      implementationNotes: row._count.implementationNotes,
      alternateNames: row._count.alternateNames,
      relationships: row._count.relationshipsAsSource,
    },
  };
}

/**
 * One project in full domain shape, drafts included.
 *
 * Reuses the same reconstruction the public site and `db:verify` use, with no
 * publication filter — so the admin detail screen shows a draft exactly as it
 * would look once published, rather than a second rendering of the data that
 * could drift from the real one.
 */
export async function getProjectDetailForAdmin(
  slug: string,
  client: PrismaClient = prisma,
): Promise<Project | null> {
  const all = await readProjectsFromDatabase(client);
  return all.find((project) => project.slug === slug) ?? null;
}

/** One past the highest display order, so a new project lands at the end. */
export async function nextDisplayOrder(client: Tx | PrismaClient = prisma): Promise<number> {
  const last = await client.project.findFirst({
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });
  return last === null ? 0 : last.displayOrder + 1;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Columns shared by create and update. Nothing outside this object is written. */
function scalarData(values: ProjectFormValues) {
  return {
    title: values.title,
    shortDescription: values.shortDescription,
    category: CATEGORY_MAP[values.category],
    status: STATUS_MAP[values.status],
    evidenceStatus: EVIDENCE_MAP[values.evidenceStatus],
    verificationNotes: values.verificationNotes,
    featured: values.featured,
    source: values.source,
    githubUrl: values.githubUrl,
    demoUrl: values.demoUrl,
    displayOrder: values.displayOrder,
    publicationStatus: values.publicationStatus,
    // Provenance: this row is now CMS-authored, so db:import will refuse to
    // overwrite it without an explicit flag. See prisma/schema.prisma.
    contentOrigin: "cms" as const,
  };
}

/**
 * Replace a project's technology links.
 *
 * Technologies are a shared lookup, so the name row is upserted rather than
 * created — two projects using "PyTorch" must point at one row
 * (CMS_SPECIFICATION.md §18). Only this project's join rows are deleted; the
 * `technologies` rows themselves are never removed, because another project
 * may reference them and the join's `onDelete: Restrict` exists to say so. A
 * technology that ends up unused is harmless and is cleaned up, if ever, by a
 * deliberate maintenance task.
 */
async function syncTechnologies(tx: Tx, projectId: number, names: string[]): Promise<void> {
  await tx.projectTechnology.deleteMany({ where: { projectId } });
  if (names.length === 0) return;

  const ids: number[] = [];
  for (const name of names) {
    const technology = await tx.technology.upsert({
      where: { name },
      create: { name },
      update: {},
      select: { id: true },
    });
    ids.push(technology.id);
  }

  await tx.projectTechnology.createMany({
    data: ids.map((technologyId, index) => ({ projectId, technologyId, displayOrder: index })),
  });
}

/**
 * `published_at` is stamped the first time a project becomes published and
 * never cleared afterwards — §46 says unpublishing must keep the content
 * recoverable, and the original publication date is part of that record.
 */
function publishedAtFor(
  next: PublicationStatus,
  existing: Date | null,
  now: Date,
): Date | null {
  if (next !== "published") return existing;
  return existing ?? now;
}

export async function createProjectWithin(
  tx: Tx,
  values: ProjectFormValues,
  now: Date = new Date(),
  context: RevisionContext = {},
): Promise<{ id: number; slug: string }> {
  let created: { id: number; slug: string };
  try {
    created = await tx.project.create({
      data: {
        slug: values.slug,
        ...scalarData(values),
        publishedAt: publishedAtFor(values.publicationStatus, null, now),
      },
      select: { id: true, slug: true },
    });
  } catch (error) {
    // The UNIQUE index on slug is the authority on collisions, not a prior
    // SELECT — which would still race with a concurrent insert.
    if (isUniqueViolation(error)) throw new DuplicateSlugError(values.slug);
    throw error;
  }

  await syncTechnologies(tx, created.id, values.technologies);

  // After the technologies, not before: the snapshot has to be of the project
  // as it finally stands, children included. Inside the caller's transaction,
  // so a rolled-back create leaves no revision behind.
  await recordProjectRevisionWithin(tx, created.id, {
    ...context,
    summary: context.summary ?? "Created",
  });

  return created;
}

export async function updateProjectWithin(
  tx: Tx,
  slug: string,
  values: ProjectFormValues,
  now: Date = new Date(),
  context: RevisionContext = {},
): Promise<{ id: number; slug: string }> {
  const existing = await tx.project.findUnique({
    where: { slug },
    select: { id: true, publishedAt: true },
  });
  if (existing === null) throw new ProjectNotFoundError(slug);

  let updated: { id: number; slug: string };
  try {
    updated = await tx.project.update({
      where: { id: existing.id },
      data: {
        slug: values.slug,
        ...scalarData(values),
        publishedAt: publishedAtFor(values.publicationStatus, existing.publishedAt, now),
      },
      select: { id: true, slug: true },
    });
  } catch (error) {
    // Renaming onto another project's slug.
    if (isUniqueViolation(error)) throw new DuplicateSlugError(values.slug);
    throw error;
  }

  await syncTechnologies(tx, existing.id, values.technologies);

  await recordProjectRevisionWithin(tx, existing.id, {
    ...context,
    summary: context.summary ?? "Edited",
  });

  return updated;
}

/** Create a project. One transaction across projects + technologies. */
export function createProject(
  values: ProjectFormValues,
  context: RevisionContext = {},
): Promise<{ id: number; slug: string }> {
  return prisma.$transaction((tx) => createProjectWithin(tx, values, new Date(), context));
}

/** Update a project by its current slug. One transaction across projects + technologies. */
export function updateProject(
  slug: string,
  values: ProjectFormValues,
  context: RevisionContext = {},
): Promise<{ id: number; slug: string }> {
  return prisma.$transaction((tx) => updateProjectWithin(tx, slug, values, new Date(), context));
}

// ---------------------------------------------------------------------------
// Publish / unpublish (CMS_SPECIFICATION.md §45, §46)
// ---------------------------------------------------------------------------

/** The result of a publication-state change, for the confirmation message. */
export interface PublicationChange {
  slug: string;
  status: PublicationStatus;
  publishedAt: Date | null;
  /** True when this call is what first published the project. */
  firstPublish: boolean;
}

/**
 * Change only a project's publication state.
 *
 * Writes exactly three columns — `publication_status`, `published_at` and
 * `content_origin`. Every other scalar and every child row is left untouched,
 * so publishing cannot alter a metric, a result, an alternate name, a
 * relationship, or the internal verification notes. That is the whole point of
 * separating this from `updateProject`: going live must not be a content edit.
 *
 * `published_at` is stamped on the first publish and never cleared, including
 * on unpublish — §46 requires unpublished content to stay recoverable, and
 * when it first went live is part of that record.
 *
 * ── Why this also sets content_origin = "cms" ─────────────────────────────
 * Not bookkeeping; a correctness fix. `scripts/db/import.ts` writes
 * `publicationStatus: "published"` for every row it touches. Without this
 * flag, unpublishing a project that originally came from content/projects.ts
 * would be silently undone by the next routine `db:import` — the project would
 * reappear on the public site with no warning, because the importer's refusal
 * only triggers on CMS-authored rows. Marking it makes that refusal fire.
 */
export async function setPublicationStatusWithin(
  tx: Tx,
  slug: string,
  status: PublicationStatus,
  now: Date = new Date(),
  context: RevisionContext = {},
): Promise<PublicationChange> {
  const existing = await tx.project.findUnique({
    where: { slug },
    select: { id: true, publishedAt: true },
  });
  if (existing === null) throw new ProjectNotFoundError(slug);

  const publishedAt = publishedAtFor(status, existing.publishedAt, now);

  const row = await tx.project.update({
    where: { id: existing.id },
    data: { publicationStatus: status, publishedAt, contentOrigin: "cms" },
    select: { slug: true, publicationStatus: true, publishedAt: true },
  });

  // A publication change is a content event worth keeping: §67 distinguishes
  // "current published version" from "previous versions", which is only
  // answerable if going live and coming down are both in the history. The
  // snapshot is identical in content to the previous revision — what differs
  // is `publicationStatusAtRevision`, which is exactly the question being
  // recorded.
  await recordProjectRevisionWithin(tx, existing.id, {
    ...context,
    summary: context.summary ?? (status === "published" ? "Published" : `Set to ${status}`),
  });

  return {
    slug: row.slug,
    status: row.publicationStatus,
    publishedAt: row.publishedAt,
    firstPublish: status === "published" && existing.publishedAt === null,
  };
}

/**
 * Publish or unpublish one project.
 *
 * Wrapped in a transaction even though it is a single statement: the read of
 * `published_at` and the write that depends on it must not interleave with
 * another change, or two concurrent publishes could each decide they were the
 * first and race on the timestamp.
 */
export function setPublicationStatus(
  slug: string,
  status: PublicationStatus,
  context: RevisionContext = {},
): Promise<PublicationChange> {
  return prisma.$transaction((tx) =>
    setPublicationStatusWithin(tx, slug, status, new Date(), context),
  );
}

// ---------------------------------------------------------------------------
// Restore (CMS_SPECIFICATION.md §49, ADMIN_DASHBOARD_SPECIFICATION.md §59,
// IMPLEMENTATION_ROADMAP.md §53)
// ---------------------------------------------------------------------------

/** What a restore did, for the confirmation message. */
export interface RestoreResult {
  slug: string;
  /** The version that was restored *from*. */
  restoredFrom: number;
  /** The new version the restore itself created. */
  newVersion: number;
  /** Unchanged by the restore — included so the screen can say so. */
  publicationStatus: PublicationStatus;
}

/**
 * Restore a project to an earlier revision, inside the caller's transaction.
 *
 * ── Why this goes through `updateProjectWithin` ───────────────────────────
 * Restore is an edit whose values happen to come from history rather than from
 * a keyboard. Routing it through the ordinary update path means it inherits,
 * rather than re-implements: the slug-collision handling, the technology
 * synchronisation, the deliberate *non*-writing of metrics, results,
 * implementation notes, alternate names and relationships (see the header of
 * this file), and the recording of a new revision. A bespoke restore writer
 * would be a second content-write path that could drift from the first — and
 * the drift would show up as data loss.
 *
 * ── History is appended to, never rewound ─────────────────────────────────
 * §53: "Never destroy history silently." No revision row is updated or
 * deleted here. Restoring v1 over v7 produces v8, whose snapshot happens to
 * match v1's content; v1 through v7 remain exactly as they were, and the
 * restore is itself inspectable afterwards.
 *
 * ── It does not publish ───────────────────────────────────────────────────
 * The project's current publication status is read here and passed to the
 * validator, which substitutes it for whatever the snapshot recorded. See
 * lib/admin/restore.ts for why that is the correct reading of §59.4. A
 * restored draft stays a draft; a restored published project stays published
 * and keeps its `published_at`.
 *
 * ── Project isolation ─────────────────────────────────────────────────────
 * The revision is fetched by `(projectId, revisionId)` together. A revision id
 * belonging to another project does not match and raises
 * `RevisionNotFoundError` before anything is written — the id in the request
 * selects *within* the named project, it never selects the project.
 */
export async function restoreProjectRevisionWithin(
  tx: Tx,
  slug: string,
  revisionId: number,
  now: Date = new Date(),
  context: RevisionContext = {},
): Promise<RestoreResult> {
  const existing = await tx.project.findUnique({
    where: { slug },
    select: { id: true, publicationStatus: true },
  });
  if (existing === null) throw new ProjectNotFoundError(slug);

  const revision = await getProjectRevision(existing.id, revisionId, tx);
  if (revision === null) throw new RevisionNotFoundError(slug, revisionId);

  // The snapshot is held to the same validation a human submission gets. A
  // revision written by an older schema is refused, not coerced.
  const parsed = parseSnapshotForRestore(revision.snapshot, existing.publicationStatus);
  if (!parsed.ok) throw new InvalidRevisionError(parsed.errors);

  const restored = await updateProjectWithin(tx, slug, parsed.values, now, {
    ...context,
    // Names the source version, so the history reads as a narrative rather
    // than as an unexplained repetition of older content.
    summary: context.summary ?? `Restored v${revision.versionNumber}`,
  });

  const created = await tx.contentRevision.findFirst({
    where: { entityType: "project", entityId: restored.id },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });

  return {
    slug: restored.slug,
    restoredFrom: revision.versionNumber,
    // `updateProjectWithin` has just recorded one, so this cannot be null;
    // falling back to the source version would be a lie if it ever were.
    newVersion: created?.versionNumber ?? revision.versionNumber + 1,
    publicationStatus: existing.publicationStatus,
  };
}

/**
 * Restore one project to an earlier revision.
 *
 * One transaction across the project row, its technology joins and the new
 * revision. A failure at any point — a snapshot that fails validation, a slug
 * that now collides with another project — leaves the project exactly as it
 * was, with no partial write and no orphan revision.
 */
export function restoreProjectRevision(
  slug: string,
  revisionId: number,
  context: RevisionContext = {},
): Promise<RestoreResult> {
  return prisma.$transaction((tx) =>
    restoreProjectRevisionWithin(tx, slug, revisionId, new Date(), context),
  );
}
