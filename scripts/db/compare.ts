// Phase 7B-1 — Compare / Verify.
//
// Reads the database back through the shared read model
// (lib/repositories/read-model.ts), which rebuilds the exact shapes that
// content/projects.ts and content/resume-data.ts export, and diffs them
// against the real source modules (docs/DATABASE_DESIGN.md §25: "Compare" then
// "Verify — 13/13 projects, 1/1 profile, byte-for-byte equivalent content").
//
// The reconstruction itself lives in the read model so that the verifier and
// the application read path (Phase 7B-2) can never certify different shapes.
//
// This is the step that proves the database is a faithful replica. It has no
// authority to change anything: a difference is reported, never reconciled.
//
// Canonicalization and the structural diff live in lib/content/canonical.ts,
// shared with the database repository contract tests so both certify the same
// thing. That module's header documents the one normalization applied to both
// sides (an absent optional array and an explicitly empty one both canonicalize
// to []) and why it is rendering-lossless.

import { createHash } from "node:crypto";

import { projects as sourceProjects } from "@/content/projects";
import {
  canonicalProject,
  canonicalSourceProfile,
  diff,
  type DatabaseProfile,
  type Difference,
  type RowCountManifest,
} from "@/lib/content/canonical";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { readProfileFromDatabase, readProjectsFromDatabase } from "@/lib/repositories/read-model";

export interface EntityComparison {
  entity: string;
  ok: boolean;
  differences: Difference[];
}

export interface ComparisonReport {
  projects: EntityComparison[];
  profile: EntityComparison[];
  /** Slugs present in one side but not the other. */
  missingInDatabase: string[];
  extraInDatabase: string[];
  /** Projects compared / projects expected — the "13/13" figure. */
  projectsCompared: number;
  projectsExpected: number;
  ok: boolean;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export async function compareAll(
  prisma: PrismaClient,
  options: { projectSlugs?: string[]; includeProfile?: boolean } = {},
): Promise<ComparisonReport> {
  const includeProfile = options.includeProfile ?? true;
  const scoped = options.projectSlugs ? new Set(options.projectSlugs) : null;
  const expected = scoped
    ? sourceProjects.filter((p) => scoped.has(p.slug))
    : [...sourceProjects];

  const databaseProjects = await readProjectsFromDatabase(prisma);
  const databaseBySlug = new Map(databaseProjects.map((p) => [p.slug, p]));

  const report: ComparisonReport = {
    projects: [],
    profile: [],
    missingInDatabase: [],
    extraInDatabase: [],
    projectsCompared: 0,
    projectsExpected: expected.length,
    ok: true,
  };

  for (const sourceProject of expected) {
    const dbProject = databaseBySlug.get(sourceProject.slug);
    if (dbProject === undefined) {
      report.missingInDatabase.push(sourceProject.slug);
      report.projects.push({
        entity: `project:${sourceProject.slug}`,
        ok: false,
        differences: [{ path: "", source: "present", database: "missing" }],
      });
      continue;
    }
    const differences = diff(
      canonicalProject(sourceProject),
      canonicalProject(dbProject),
      `project:${sourceProject.slug}`,
    );
    report.projects.push({
      entity: `project:${sourceProject.slug}`,
      ok: differences.length === 0,
      differences,
    });
    report.projectsCompared += 1;
  }

  // Anything in the database that the source does not declare. During a pilot
  // run only the scoped projects are expected, so this is checked against the
  // full source list rather than the scoped one.
  const sourceSlugs = new Set(sourceProjects.map((p) => p.slug));
  report.extraInDatabase = databaseProjects.map((p) => p.slug).filter((s) => !sourceSlugs.has(s));

  // Ordering is content, not incidental: display_order must reproduce the
  // source array order exactly (CMS_SPECIFICATION.md §23).
  if (!scoped) {
    const sourceOrder = sourceProjects.map((p) => p.slug);
    const databaseOrder = databaseProjects.map((p) => p.slug);
    if (sourceOrder.join("|") !== databaseOrder.join("|")) {
      report.projects.push({
        entity: "projects:order",
        ok: false,
        differences: [{ path: "displayOrder", source: sourceOrder, database: databaseOrder }],
      });
    } else {
      report.projects.push({ entity: "projects:order", ok: true, differences: [] });
    }
  }

  if (includeProfile) {
    const dbProfile = await readProfileFromDatabase(prisma);
    if (dbProfile === null) {
      report.profile.push({
        entity: "profile",
        ok: false,
        differences: [{ path: "", source: "present", database: "missing" }],
      });
    } else {
      const src = canonicalSourceProfile();
      for (const key of Object.keys(src) as (keyof DatabaseProfile)[]) {
        const differences = diff(src[key], dbProfile[key], `profile.${key}`);
        report.profile.push({
          entity: `profile.${key}`,
          ok: differences.length === 0,
          differences,
        });
      }
    }
  }

  report.ok =
    report.projects.every((c) => c.ok) &&
    report.profile.every((c) => c.ok) &&
    report.missingInDatabase.length === 0 &&
    report.extraInDatabase.length === 0 &&
    report.projectsCompared === report.projectsExpected;

  return report;
}

/**
 * Actual row counts, keyed identically to the manifest normalize() produces,
 * so "13/13 projects, 1/1 profile" can be checked table by table rather than
 * inferred from the comparison passing.
 */
export async function readRowCounts(prisma: PrismaClient): Promise<RowCountManifest> {
  const [
    projectCount,
    alternateNames,
    metrics,
    implementationNotes,
    contentListItems,
    relationships,
    projectTechnologies,
    technologies,
    profile,
    education,
    experience,
    experienceHighlights,
    achievements,
    skills,
    financeAreas,
    technologyFinanceAreas,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.projectAlternateName.count(),
    prisma.projectMetric.count(),
    prisma.projectImplementationNote.count(),
    prisma.projectContentListItem.count(),
    prisma.projectRelationship.count(),
    prisma.projectTechnology.count(),
    prisma.technology.count(),
    prisma.profile.count(),
    prisma.education.count(),
    prisma.experience.count(),
    prisma.experienceHighlight.count(),
    prisma.achievement.count(),
    prisma.skill.count(),
    prisma.financeArea.count(),
    prisma.technologyFinanceArea.count(),
  ]);

  return {
    projects: projectCount,
    project_alternate_names: alternateNames,
    project_metrics: metrics,
    project_implementation_notes: implementationNotes,
    project_content_list_items: contentListItems,
    project_relationships: relationships,
    project_technologies: projectTechnologies,
    technologies,
    profile,
    education,
    experience,
    experience_highlights: experienceHighlights,
    achievements,
    skills,
    finance_areas: financeAreas,
    technology_finance_areas: technologyFinanceAreas,
  };
}



/**
 * Content-only fingerprint of the whole replica. Deliberately excludes
 * surrogate ids and the created_at/updated_at columns, which change on every
 * import by design — so an unchanged fingerprint across two runs is exactly
 * the idempotency claim being made.
 */
export async function contentFingerprint(prisma: PrismaClient): Promise<string> {
  const projects = (await readProjectsFromDatabase(prisma)).map(canonicalProject);
  const profile = await readProfileFromDatabase(prisma);
  return createHash("sha256")
    .update(JSON.stringify({ projects, profile }))
    .digest("hex");
}

export function formatComparisonReport(report: ComparisonReport): string {
  const lines: string[] = [];
  for (const entry of [...report.projects, ...report.profile]) {
    lines.push(`  ${entry.ok ? "PASS" : "FAIL"}  ${entry.entity}`);
    for (const d of entry.differences.slice(0, 20)) {
      lines.push(`          ${d.path}`);
      lines.push(`            source:   ${JSON.stringify(d.source)}`);
      lines.push(`            database: ${JSON.stringify(d.database)}`);
    }
    if (entry.differences.length > 20) {
      lines.push(`          ... ${entry.differences.length - 20} more difference(s)`);
    }
  }
  return lines.join("\n");
}
