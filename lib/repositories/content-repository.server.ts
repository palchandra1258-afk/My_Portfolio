// The application-facing content repository — Phase 7B-2 Step 4.
//
// Every page, component, metadata function and sitemap reads through this
// module. None of them knows which source is active, and none of them reads
// CONTENT_SOURCE; selection happens here, once.
//
//     app/ + components/
//            ↓
//     content-repository.server.ts        ← selection, fallback policy, provenance
//            ↓
//      ┌─────┴──────┐
//      ↓            ↓
//  TypeScript    *.server.ts → read-model → Prisma → PostgreSQL
//  content/*.ts
//
// ── Source consistency ─────────────────────────────────────────────────────
// The active source is resolved once per process and latched. Every read after
// that — projects and profile alike — uses the same source, so a render can
// never mix a PostgreSQL project list with a TypeScript profile. If a build
// falls back because the database is unreachable, the latch records TypeScript
// and the whole build stays on TypeScript.
//
// ── Fallback policy (approved J-4) ─────────────────────────────────────────
//   A  database unavailable  → TypeScript fallback during a static build only,
//                              logged loudly; a loud failure everywhere else
//                              (dev-server runtime and production runtime
//                              alike) — only `next build`'s static generation
//                              is allowed to substitute stale content.
//   B  query failure         → never falls back; rethrown as ContentQueryError.
//   C  missing record        → `null`, so the route calls notFound(). Never
//                              resurrected from TypeScript.
//   D  invalid data          → never coerced, never falls back; throws
//                              InvalidContentError.
// Only A is caught, and only after `isDatabaseUnavailable` positively
// recognizes it. There is no blanket try/catch in this file.
//
// ── Caching ────────────────────────────────────────────────────────────────
// No caching layer is added here. The database repositories already wrap their
// reads in React `cache()`, and this module delegates straight to them, so one
// render performs one project read and one profile read regardless of how many
// components ask.

import "server-only";

import { canonicalSourceProfile } from "@/lib/content/canonical";
import {
  resolveContentSource,
  type ContentSource,
  type ContentSourceDecision,
} from "@/lib/content/content-source";
import {
  ContentQueryError,
  ContentUnavailableError,
  isDatabaseUnavailable,
} from "@/lib/content/database-availability";
import { toProfileContent, type ProfileContent } from "@/lib/content/profile-content";
import {
  featuredProjects as tsFeaturedProjects,
  projects as tsProjects,
} from "@/lib/repositories/project-repository";
import type { Project } from "@/lib/types";

/** True while `next build` is prerendering. Set by Next; verified present in this project's build. */
function isStaticBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

export interface ActiveSource {
  /** The source actually in use — may differ from the requested one if a build fell back. */
  source: ContentSource;
  requested: ContentSource;
  fellBack: boolean;
}

let latched: Promise<ActiveSource> | undefined;

function logDecision(active: ActiveSource, decision: ContentSourceDecision): void {
  // Deliberately plain console output — no logging framework, no secrets.
  // CONTENT_SOURCE is a mode name; DATABASE_URL is never touched here.
  if (active.fellBack) {
    console.warn(
      "\n[content-source] ⚠ FALLBACK: CONTENT_SOURCE=database was requested, but the " +
        "database is unavailable.\n" +
        "[content-source]   This build is serving TypeScript content from content/*.ts.\n" +
        "[content-source]   The output is only as fresh as the TypeScript source — do not " +
        "treat it as database-backed.\n",
    );
    return;
  }
  console.log(
    `[content-source] active=${active.source} (requested=${active.requested}, ` +
      `reason=${decision.reason}, phase=${isStaticBuild() ? "build" : process.env.NODE_ENV ?? "unknown"})`,
  );
}

/**
 * Probe the database once, so unavailability is discovered before any page
 * renders rather than halfway through a build.
 *
 * Only `isDatabaseUnavailable` errors are eligible for fallback, and only
 * during a static build. A query failure from this probe is a Case B error and
 * propagates unchanged.
 */
async function resolveActive(): Promise<ActiveSource> {
  const decision = resolveContentSource({
    CONTENT_SOURCE: process.env.CONTENT_SOURCE,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (decision.source === "typescript") {
    const active: ActiveSource = { source: "typescript", requested: "typescript", fellBack: false };
    logDecision(active, decision);
    return active;
  }

  try {
    const { getAllProjects } = await import("@/lib/repositories/project-repository.server");
    await getAllProjects();
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      // Case B / Case D: the database answered, or the data was unusable.
      throw error;
    }
    if (!isStaticBuild()) {
      // Case A outside a static build — dev-server runtime and production
      // runtime alike: refuse to downgrade a live/running process to stale
      // content. Only `next build`'s static generation may fall back; a
      // developer who explicitly set CONTENT_SOURCE=database in `npm run
      // dev` and has no reachable database needs to see that immediately,
      // not have it silently swapped for content/*.ts.
      throw new ContentUnavailableError(
        "CONTENT_SOURCE=database but the database is unavailable. Refusing to serve " +
          "TypeScript content outside a static build, which would silently be stale.",
        { cause: error },
      );
    }
    const active: ActiveSource = { source: "typescript", requested: "database", fellBack: true };
    logDecision(active, decision);
    return active;
  }

  const active: ActiveSource = { source: "database", requested: "database", fellBack: false };
  logDecision(active, decision);
  return active;
}

/** The source in use. Resolved once per process and reused, which is what keeps a render consistent. */
export function getActiveSource(): Promise<ActiveSource> {
  latched ??= resolveActive();
  return latched;
}

/** Test seam: forget the latched decision. Not used by application code. */
export function __resetActiveSourceForTests(): void {
  latched = undefined;
}

/**
 * Run a database read, classifying any failure rather than swallowing it.
 * Reached only when the active source is already `database`, so unavailability
 * here means the connection dropped mid-build — still not a reason to serve
 * different content than the rest of the render.
 */
async function fromDatabase<T>(what: string, read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      throw new ContentUnavailableError(
        `The database became unavailable while reading ${what}. The active content source ` +
          "for this render is already `database`; switching sources midway would mix " +
          "database and TypeScript content in one page.",
        { cause: error },
      );
    }
    throw new ContentQueryError(
      `Reading ${what} from the database failed. This is a query error, not an availability ` +
        "problem, so TypeScript content is deliberately NOT substituted.",
      { cause: error },
    );
  }
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function getAllProjects(): Promise<Project[]> {
  const { source } = await getActiveSource();
  if (source === "typescript") return [...tsProjects];

  const { getAllProjects: dbGetAllProjects } = await import(
    "@/lib/repositories/project-repository.server"
  );
  return fromDatabase("projects", dbGetAllProjects);
}

/** `null` for an unknown slug — Case C. Never falls back to the TypeScript entry. */
export async function getProject(slug: string): Promise<Project | null> {
  const { source } = await getActiveSource();
  if (source === "typescript") return tsProjects.find((p) => p.slug === slug) ?? null;

  const { getProject: dbGetProject } = await import(
    "@/lib/repositories/project-repository.server"
  );
  return fromDatabase(`project "${slug}"`, () => dbGetProject(slug));
}

export async function getFeaturedProjects(): Promise<Project[]> {
  const { source } = await getActiveSource();
  if (source === "typescript") return [...tsFeaturedProjects];

  const { getFeaturedProjects: dbGetFeaturedProjects } = await import(
    "@/lib/repositories/project-repository.server"
  );
  return fromDatabase("featured projects", dbGetFeaturedProjects);
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/**
 * The whole profile in one read, from whichever source is active.
 *
 * Both sources go through `toProfileContent`, which is what makes the two
 * paths provably the same shape: `canonicalSourceProfile()` already renders
 * content/resume-data.ts into the consolidated form, and the database path
 * produces the same form via the read model. Validating both means a drift in
 * either one surfaces as a loud error rather than a rendering oddity.
 */
export async function getProfile(): Promise<ProfileContent> {
  const { source } = await getActiveSource();
  if (source === "typescript") return toProfileContent(canonicalSourceProfile());

  const { getProfile: dbGetProfile } = await import(
    "@/lib/repositories/profile-repository.server"
  );
  const raw = await fromDatabase("profile", dbGetProfile);
  return toProfileContent(raw);
}

export type { ProfileContent };
