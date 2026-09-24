// Tests for the dashboard overview figures — Phase 6.
//
// Two things matter here. The counts have to be right, because an operator
// will act on them. And the evidence-marker count has to be right for the
// specific reason that it is the number telling the owner how much unverified
// placeholder text is currently visible to visitors — undercounting it would
// quietly hide the problem the marker convention exists to expose.
//
// The last test runs against the real content/projects.ts, so the suite fails
// if the summary ever stops being able to read the actual portfolio.

import { describe, expect, it } from "vitest";

import { projects as realProjects } from "@/lib/repositories/project-repository";
import type { Project } from "@/lib/types";

import { countEvidenceMarkers, summarizeProjects } from "./project-summary";

function project(overrides: Partial<Project> = {}): Project {
  return {
    slug: "example",
    title: "Example",
    category: "supporting",
    status: "Completed",
    featured: false,
    shortDescription: "A project.",
    technologies: [],
    metrics: [],
    evidenceStatus: "self-reported",
    verificationNotes: "Notes.",
    source: "GitHub",
    ...overrides,
  };
}

describe("countEvidenceMarkers", () => {
  it("returns zero for a project with no placeholders", () => {
    expect(countEvidenceMarkers(project())).toBe(0);
  });

  it("finds markers in narrative fields", () => {
    expect(
      countEvidenceMarkers(
        project({
          problem: "Dataset size is [NEEDS INFORMATION].",
          approach: "Architecture [NEEDS VERIFICATION].",
        }),
      ),
    ).toBe(2);
  });

  it("finds markers inside arrays and metrics", () => {
    expect(
      countEvidenceMarkers(
        project({
          results: ["Accuracy [NEEDS VERIFICATION]"],
          whatIsWorking: ["Pipeline [NEEDS INFORMATION]"],
          whatIsInDevelopment: ["Export [NEEDS INFORMATION]"],
          metrics: [
            { label: "CIDEr", value: "[NEEDS VERIFICATION]", kind: "needs-verification" },
            { label: "Params", value: "12M", kind: "scope", note: "Source [NEEDS INFORMATION]" },
          ],
          relatedTo: [{ slug: "other", note: "Shared code [NEEDS VERIFICATION]" }],
        }),
      ),
    ).toBe(6);
  });

  it("counts several markers in one string", () => {
    expect(
      countEvidenceMarkers(
        project({ problem: "[NEEDS INFORMATION] and again [NEEDS INFORMATION]" }),
      ),
    ).toBe(2);
  });

  it("is not affected by the order it is called in", () => {
    // Regression guard: a module-level /g/ RegExp carries lastIndex between
    // calls, which makes the second count wrong.
    const marked = project({ problem: "[NEEDS INFORMATION]" });
    const first = countEvidenceMarkers(marked);
    countEvidenceMarkers(project({ problem: "[NEEDS VERIFICATION] [NEEDS VERIFICATION]" }));
    expect(countEvidenceMarkers(marked)).toBe(first);
  });

  it("does not match lowercase or partial placeholders", () => {
    expect(
      countEvidenceMarkers(project({ problem: "[needs information] [NEEDS] NEEDS INFORMATION" })),
    ).toBe(0);
  });
});

describe("summarizeProjects", () => {
  it("counts an empty portfolio without inventing categories", () => {
    const summary = summarizeProjects([]);
    expect(summary.total).toBe(0);
    expect(summary.featured).toBe(0);
    expect(summary.markerCount).toBe(0);
    expect(summary.byCategory).toEqual({});
  });

  it("counts totals, featured projects and markers", () => {
    const summary = summarizeProjects([
      project({ slug: "a", featured: true, category: "featured" }),
      project({ slug: "b", category: "supporting", problem: "[NEEDS INFORMATION]" }),
      project({
        slug: "c",
        category: "supporting",
        problem: "[NEEDS INFORMATION] [NEEDS VERIFICATION]",
      }),
    ]);

    expect(summary.total).toBe(3);
    expect(summary.featured).toBe(1);
    // Two projects affected, three markers between them — the distinction the
    // dashboard reports separately.
    expect(summary.needsInformation).toBe(2);
    expect(summary.markerCount).toBe(3);
  });

  it("groups by category, status and evidence status", () => {
    const summary = summarizeProjects([
      project({ slug: "a", category: "featured", status: "Completed", evidenceStatus: "verified" }),
      project({ slug: "b", category: "featured", status: "Completed", evidenceStatus: "verified" }),
      project({
        slug: "c",
        category: "research",
        status: "Active Development",
        evidenceStatus: "self-reported",
      }),
    ]);

    expect(summary.byCategory).toEqual({ featured: 2, research: 1 });
    expect(summary.byStatus).toEqual({ Completed: 2, "Active Development": 1 });
    expect(summary.byEvidence).toEqual({ verified: 2, "self-reported": 1 });
  });

  it("summarises the real portfolio content", () => {
    const summary = summarizeProjects(realProjects);

    expect(summary.total).toBe(realProjects.length);
    expect(summary.featured).toBe(realProjects.filter((p) => p.featured).length);
    // Not asserted as a fixed number: markers are resolved as the owner
    // supplies facts, and this test must not fail for that. What must hold is
    // that the counter agrees with itself.
    expect(summary.markerCount).toBeGreaterThanOrEqual(summary.needsInformation);
    expect(summary.needsInformation).toBeLessThanOrEqual(summary.total);
  });
});
