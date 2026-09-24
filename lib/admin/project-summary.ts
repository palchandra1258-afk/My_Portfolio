// Dashboard overview figures — Phase 6 (Admin Shell).
//
// ADMIN_DASHBOARD_SPECIFICATION.md §8–9: the overview must be calculated from
// actual content state, and §8 explicitly rules out vanity metrics. Everything
// below is a count of something already present in the content model — nothing
// is inferred, estimated, or invented (CLAUDE.md §6).
//
// Pure: `Project[]` in, numbers out. No database, no request, no React, so the
// figures the dashboard prints are the figures these tests assert.
//
// Note on what is deliberately absent: publication status, "last updated" and
// "recently changed" are real columns on the `projects` table, but they are
// not fields of the `Project` domain type the application reads through, and
// in TypeScript mode there is nothing to read them from. Reporting a
// fabricated "updated today" would be worse than omitting the figure, so the
// overview only counts what both sources genuinely carry. They arrive with
// Phase 9 (Draft / Preview / Publish), where the database becomes the source.

import type { ProjectCategory, ProjectStatus, PublicProject, VerificationStatus } from "@/lib/types";

/**
 * Placeholders left in content where a fact is missing or unconfirmed, per
 * docs/CONTENT_EVIDENCE_RULES.md. They are published text today, so surfacing
 * the count is content health (§80), not decoration.
 */
export const EVIDENCE_MARKERS = ["[NEEDS INFORMATION]", "[NEEDS VERIFICATION]"] as const;

export interface ProjectSummary {
  total: number;
  featured: number;
  /** Projects carrying at least one unresolved evidence marker. */
  needsInformation: number;
  /** Total marker occurrences across all projects — a project may hold several. */
  markerCount: number;
  // Partial, not Record: a category with no projects has no key rather than a
  // zero, so a caller that forgets to default gets `undefined` instead of a
  // confident, wrong 0.
  byCategory: Partial<Record<ProjectCategory, number>>;
  byStatus: Partial<Record<ProjectStatus, number>>;
  byEvidence: Partial<Record<VerificationStatus, number>>;
}

/**
 * Every free-text string a project carries, flattened.
 *
 * Listed field by field rather than walked reflectively: a generic deep walk
 * would silently start counting any string field added later, including ones
 * where a bracketed marker is not an evidence placeholder at all.
 */
function projectStrings(project: PublicProject): string[] {
  const out: string[] = [
    project.title,
    project.shortDescription,
    // verificationNotes is deliberately absent. It is internal, admin-only
    // material and no longer reaches a visitor, so a marker sitting in it is
    // not "visible to visitors" — counting it here would overstate the figure
    // the dashboard reports. The admin project page highlights markers in the
    // notes separately, where they are actually shown.
    project.problem ?? "",
    project.approach ?? "",
    project.architecture ?? "",
    ...(project.results ?? []),
    ...(project.whatIsWorking ?? []),
    ...(project.whatIsInDevelopment ?? []),
  ];
  for (const metric of project.metrics) {
    out.push(metric.label, metric.value, metric.note ?? "");
  }
  for (const related of project.relatedTo ?? []) {
    out.push(related.note);
  }
  return out;
}

/** How many evidence placeholders this project still carries. */
export function countEvidenceMarkers(project: PublicProject): number {
  let count = 0;
  for (const text of projectStrings(project)) {
    for (const marker of EVIDENCE_MARKERS) {
      // indexOf loop rather than a shared global RegExp: a /g/ regex carries
      // lastIndex between calls, which makes counts depend on call order.
      let from = text.indexOf(marker);
      while (from !== -1) {
        count += 1;
        from = text.indexOf(marker, from + marker.length);
      }
    }
  }
  return count;
}

function tally<K extends string>(values: K[]): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  for (const value of values) out[value] = (out[value] ?? 0) + 1;
  return out;
}

/** The dashboard overview, computed from the projects actually being served. */
export function summarizeProjects(projects: readonly PublicProject[]): ProjectSummary {
  const markerCounts = projects.map(countEvidenceMarkers);

  return {
    total: projects.length,
    featured: projects.filter((p) => p.featured).length,
    needsInformation: markerCounts.filter((n) => n > 0).length,
    markerCount: markerCounts.reduce((sum, n) => sum + n, 0),
    byCategory: tally(projects.map((p) => p.category)),
    byStatus: tally(projects.map((p) => p.status)),
    byEvidence: tally(projects.map((p) => p.evidenceStatus)),
  };
}
