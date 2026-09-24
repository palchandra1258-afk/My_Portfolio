// Canonicalization and structural comparison — the pure layer.
//
// Promoted verbatim from scripts/db/compare.ts (Phase 7B-1), where this logic
// was written and proven. It lives in lib/content/ so that everything which
// needs to compare content — the migration verifier under scripts/db/ and the
// database repository contract tests under lib/repositories/ — shares one
// implementation. Two comparison implementations could disagree, and the one
// used by the verifier would then certify something the tests do not check.
//
// ── Database-free and client-safe ──────────────────────────────────────────
// Nothing here imports Prisma, lib/db.ts, a *.server.ts module, `server-only`,
// read-model.ts, or anything under scripts/. These functions operate purely on
// already-materialized data — a `Project` object is a `Project` object whether
// it came from content/projects.ts or was rebuilt from PostgreSQL, and that is
// exactly what makes comparing the two meaningful.
//
// ── One documented normalization ───────────────────────────────────────────
// Both sides are canonicalized identically before diffing, and the only
// normalization that loses a distinction present in the source is this one:
//
//   An optional array that is *absent* in TypeScript (`whatIsWorking`
//   undefined) and one that is *explicitly empty* (`results: []`) both become
//   zero child rows in project_content_list_items, and both canonicalize to
//   [].
//
// This is deliberate and rendering-lossless: app/projects/[slug]/page.tsx
// gates every one of these lists on `x && x.length > 0`, so absent and empty
// produce identical output. The distinction is reported explicitly by
// `emptyVsAbsentArrayNotes()` rather than passed over in silence — 10 of the
// 13 projects carry `results: []` today. No other field is normalized: every
// string, number, boolean and enum value must match exactly.

import { projects as sourceProjects } from "@/content/projects";
import {
  achievements as sourceAchievements,
  additionalVerifiedSkills as sourceAdditionalSkills,
  education as sourceEducation,
  experience as sourceExperience,
  financeAreas as sourceFinanceAreas,
  personal as sourcePersonal,
  skills as sourceSkills,
  technologyXFinanceAreas as sourceTechFinanceAreas,
} from "@/content/resume-data";
import type { ImplementationNote, Metric, Project, PublicProject } from "@/lib/types";

/**
 * Plain JSON-shaped value. Used by `DatabaseProfile` below and by the
 * canonicalization functions, so the reconstruction in
 * lib/repositories/read-model.ts and the comparison here describe the same
 * thing.
 */
export type Canonical = string | number | boolean | null | Canonical[] | { [k: string]: Canonical };

/**
 * The profile as materialized data — the shape content/resume-data.ts exports,
 * and the shape lib/repositories/read-model.ts rebuilds from PostgreSQL.
 * Declared here rather than beside the database reader because it describes
 * content, not storage.
 */
export interface DatabaseProfile {
  personal: Record<string, string>;
  education: Canonical[];
  experience: Canonical[];
  achievements: Canonical[];
  financeAreas: Canonical[];
  technologyXFinanceAreas: string[];
  skills: Record<string, string[]>;
  additionalVerifiedSkills: string[];
}

export interface Difference {
  path: string;
  source: unknown;
  database: unknown;
}

/**
 * Expected row count per table, keyed by database table name. Produced by
 * normalization from the TypeScript source and compared against the real
 * counts by `diffRowCounts`.
 */
export interface RowCountManifest {
  projects: number;
  project_alternate_names: number;
  project_metrics: number;
  project_implementation_notes: number;
  project_content_list_items: number;
  project_relationships: number;
  project_technologies: number;
  technologies: number;
  profile: number;
  education: number;
  experience: number;
  experience_highlights: number;
  achievements: number;
  skills: number;
  finance_areas: number;
  technology_finance_areas: number;
}

export interface RowCountDifference {
  table: string;
  expected: number;
  actual: number;
}

// ---------------------------------------------------------------------------
// Canonicalization — applied to BOTH sides
// ---------------------------------------------------------------------------

function canonicalMetric(m: Metric): Canonical {
  return {
    label: m.label,
    value: m.value,
    kind: m.kind,
    note: m.note ?? null,
    source: m.source ?? null,
  };
}

function canonicalImplementationNote(n: ImplementationNote): Canonical {
  return { label: n.label, status: n.status };
}

/**
 * Reduces a Project to a plain, key-ordered structure with every optional
 * field made explicit. Used on the TypeScript source and on the
 * database-reconstructed object alike.
 */
/**
 * Canonical form of a project.
 *
 * Accepts either the full `Project` or the `PublicProject` the public read
 * path returns. `verificationNotes` is only present on the former, so it
 * canonicalizes to `null` for a public projection. Both sides of any given
 * comparison must therefore be the same kind: db:verify compares two full
 * projects, and the public contract test compares two public ones. Mixing them
 * would report the deliberate omission as a difference.
 */
export function canonicalProject(p: Project | PublicProject): Canonical {
  return {
    slug: p.slug,
    title: p.title,
    alternateNames: [...(p.alternateNames ?? [])],
    category: p.category,
    status: p.status,
    featured: p.featured,
    source: p.source,
    shortDescription: p.shortDescription,
    problem: p.problem ?? null,
    approach: p.approach ?? null,
    architecture: p.architecture ?? null,
    technologies: [...p.technologies],
    results: [...(p.results ?? [])],
    metrics: p.metrics.map(canonicalMetric),
    githubUrl: p.githubUrl ?? null,
    demoUrl: p.demoUrl ?? null,
    evidenceStatus: p.evidenceStatus,
    verificationNotes: "verificationNotes" in p ? p.verificationNotes : null,
    whatIsWorking: [...(p.whatIsWorking ?? [])],
    whatIsInDevelopment: [...(p.whatIsInDevelopment ?? [])],
    implementationNotes: (p.implementationNotes ?? []).map(canonicalImplementationNote),
    relatedTo: (p.relatedTo ?? []).map((r) => ({ slug: r.slug, note: r.note })),
  };
}

/**
 * Lists, per project, which optional arrays are explicitly `[]` in the
 * TypeScript source versus absent. Reported alongside the comparison so the
 * one distinction the database cannot represent is visible rather than hidden.
 */
export function emptyVsAbsentArrayNotes(): { slug: string; field: string; sourceForm: "[]" | "absent" }[] {
  const fields = [
    "alternateNames",
    "results",
    "whatIsWorking",
    "whatIsInDevelopment",
    "implementationNotes",
    "relatedTo",
  ] as const;
  const notes: { slug: string; field: string; sourceForm: "[]" | "absent" }[] = [];
  for (const project of sourceProjects) {
    for (const field of fields) {
      const value = (project as unknown as Record<string, unknown>)[field];
      if (value === undefined) notes.push({ slug: project.slug, field, sourceForm: "absent" });
      else if (Array.isArray(value) && value.length === 0)
        notes.push({ slug: project.slug, field, sourceForm: "[]" });
    }
  }
  return notes;
}

// ---------------------------------------------------------------------------
// Structural diff
// ---------------------------------------------------------------------------

export function diff(source: unknown, database: unknown, path = ""): Difference[] {
  if (Array.isArray(source) || Array.isArray(database)) {
    if (!Array.isArray(source) || !Array.isArray(database)) {
      return [{ path, source, database }];
    }
    const out: Difference[] = [];
    if (source.length !== database.length) {
      out.push({ path: `${path}.length`, source: source.length, database: database.length });
    }
    const n = Math.max(source.length, database.length);
    for (let i = 0; i < n; i++) {
      out.push(...diff(source[i], database[i], `${path}[${i}]`));
    }
    return out;
  }

  const bothObjects =
    typeof source === "object" && source !== null && typeof database === "object" && database !== null;
  if (bothObjects) {
    const a = source as Record<string, unknown>;
    const b = database as Record<string, unknown>;
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    const out: Difference[] = [];
    for (const key of keys) {
      out.push(...diff(a[key], b[key], path ? `${path}.${key}` : key));
    }
    return out;
  }

  // Object.is so NaN and -0 do not slip through as "equal enough".
  return Object.is(source, database) ? [] : [{ path, source, database }];
}

// ---------------------------------------------------------------------------
// Canonical form of the TypeScript profile source
// ---------------------------------------------------------------------------

export function canonicalSourceProfile(): DatabaseProfile {
  return {
    personal: {
      name: sourcePersonal.name,
      location: sourcePersonal.location,
      phone: sourcePersonal.phone,
      email: sourcePersonal.email,
      github: sourcePersonal.github,
      linkedin: sourcePersonal.linkedin,
      summary: sourcePersonal.summary,
    },
    education: sourceEducation.map((e) => ({
      institution: e.institution,
      degree: e.degree,
      duration: e.duration,
      detail: e.detail ?? null,
    })),
    experience: sourceExperience.map((x) => ({
      title: x.title,
      organization: x.organization,
      duration: x.duration,
      bullets: [...x.bullets],
    })),
    achievements: sourceAchievements.map((a) => ({
      title: a.title,
      context: a.context,
      detail: a.detail,
    })),
    financeAreas: sourceFinanceAreas.map((f) => ({ title: f.title, description: f.description })),
    technologyXFinanceAreas: [...sourceTechFinanceAreas],
    skills: Object.fromEntries(
      Object.entries(sourceSkills).map(([category, names]) => [category, [...names]]),
    ),
    additionalVerifiedSkills: [...sourceAdditionalSkills],
  };
}

// ---------------------------------------------------------------------------
// Row-count comparison
// ---------------------------------------------------------------------------

export function diffRowCounts(
  expected: RowCountManifest,
  actual: RowCountManifest,
): RowCountDifference[] {
  const out: RowCountDifference[] = [];
  for (const table of Object.keys(expected) as (keyof RowCountManifest)[]) {
    if (expected[table] !== actual[table]) {
      out.push({ table, expected: expected[table], actual: actual[table] });
    }
  }
  return out;
}
