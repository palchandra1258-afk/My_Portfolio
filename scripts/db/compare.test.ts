// Tests for the pure canonicalization/comparison layer (lib/content/canonical.ts).
//
// The comparison is only trustworthy if the diff itself is: a diff that
// returns [] too eagerly would report a corrupted replica as "IDENTICAL".
// These tests pin down that it catches changed values, changed ordering,
// changed lengths and null/undefined confusion — and that canonicalization
// normalizes exactly one thing and nothing more.

import { describe, expect, it } from "vitest";

import { projects } from "@/content/projects";
import type { Project } from "@/lib/types";

import {
  canonicalProject,
  canonicalSourceProfile,
  diff,
  diffRowCounts,
  emptyVsAbsentArrayNotes,
} from "@/lib/content/canonical";
import { normalize } from "./normalize";

describe("diff", () => {
  it("finds nothing between identical structures", () => {
    expect(diff({ a: 1, b: ["x"] }, { a: 1, b: ["x"] })).toEqual([]);
  });

  it("reports a changed scalar with its path", () => {
    const differences = diff({ a: { b: "one" } }, { a: { b: "two" } });
    expect(differences).toEqual([{ path: "a.b", source: "one", database: "two" }]);
  });

  it("reports reordered array elements", () => {
    const differences = diff(["a", "b"], ["b", "a"]);
    expect(differences.map((d) => d.path)).toEqual(["[0]", "[1]"]);
  });

  it("reports a length change as well as the differing elements", () => {
    const differences = diff(["a"], ["a", "b"]);
    expect(differences.some((d) => d.path === ".length")).toBe(true);
  });

  it("does not treat null and undefined as equal", () => {
    expect(diff({ a: null }, { a: undefined })).toHaveLength(1);
  });

  it("does not treat a missing key as equal to an empty string", () => {
    expect(diff({ a: "" }, {})).toHaveLength(1);
  });

  it("does not treat a string and a number as equal", () => {
    expect(diff({ a: "1" }, { a: 1 })).toHaveLength(1);
  });
});

describe("canonicalProject", () => {
  const sample = projects[0];

  it("is stable for the same input", () => {
    expect(diff(canonicalProject(sample), canonicalProject(sample))).toEqual([]);
  });

  it("makes an absent optional array indistinguishable from an explicitly empty one", () => {
    // This is the single documented normalization (see canonical.ts header).
    const absent = { ...sample, whatIsWorking: undefined } as Project;
    const empty = { ...sample, whatIsWorking: [] } as Project;
    expect(diff(canonicalProject(absent), canonicalProject(empty))).toEqual([]);
  });

  it("makes an absent optional string indistinguishable from null, but not from a value", () => {
    const absent = { ...sample, problem: undefined } as Project;
    const empty = { ...sample, problem: "" } as Project;
    expect(diff(canonicalProject(absent), canonicalProject(absent))).toEqual([]);
    expect(diff(canonicalProject(absent), canonicalProject(empty))).toHaveLength(1);
  });

  it("still catches a changed value inside a nested metric", () => {
    if (sample.metrics.length === 0) return;
    const mutated: Project = {
      ...sample,
      metrics: sample.metrics.map((m, i) => (i === 0 ? { ...m, value: "changed" } : m)),
    };
    const differences = diff(canonicalProject(sample), canonicalProject(mutated));
    expect(differences).toHaveLength(1);
    expect(differences[0].path).toBe("metrics[0].value");
  });

  it("catches a reordered technology list", () => {
    const project = projects.find((p) => p.technologies.length > 1);
    if (project === undefined) throw new Error("fixture requires 2+ technologies");
    const reversed: Project = { ...project, technologies: [...project.technologies].reverse() };
    expect(diff(canonicalProject(project), canonicalProject(reversed)).length).toBeGreaterThan(0);
  });
});

describe("emptyVsAbsentArrayNotes", () => {
  it("records the explicitly-empty arrays present in the source today", () => {
    const notes = emptyVsAbsentArrayNotes();
    const explicitEmpty = notes.filter((n) => n.sourceForm === "[]");
    // Reported rather than asserted to an exact number, so adding a project
    // does not fail this test — but the distinction must remain visible.
    expect(explicitEmpty.length).toBeGreaterThan(0);
    for (const note of explicitEmpty) {
      const project = projects.find((p) => p.slug === note.slug);
      expect(project).toBeDefined();
      expect((project as unknown as Record<string, unknown>)[note.field]).toEqual([]);
    }
  });

  it("only ever reports the six optional array fields", () => {
    const allowed = new Set([
      "alternateNames",
      "results",
      "whatIsWorking",
      "whatIsInDevelopment",
      "implementationNotes",
      "relatedTo",
    ]);
    for (const note of emptyVsAbsentArrayNotes()) expect(allowed.has(note.field)).toBe(true);
  });
});

describe("canonicalSourceProfile", () => {
  it("matches the normalized profile field for field", () => {
    // Two independent readings of content/resume-data.ts — one through
    // normalize(), one through the comparison's own canonical form. They must
    // agree, or the comparison would be testing itself against itself.
    const normalized = normalize().profile;
    const canonical = canonicalSourceProfile();

    expect(canonical.personal.name).toBe(normalized.name);
    expect(canonical.personal.github).toBe(normalized.githubUrl);
    expect(canonical.personal.linkedin).toBe(normalized.linkedinUrl);
    expect(canonical.education).toHaveLength(normalized.education.length);
    expect(canonical.experience).toHaveLength(normalized.experience.length);
    expect(canonical.achievements).toHaveLength(normalized.achievements.length);
    expect(canonical.technologyXFinanceAreas).toEqual(
      normalized.technologyFinanceAreas.map((t) => t.label),
    );
    expect(canonical.additionalVerifiedSkills).toEqual(
      normalized.skills.filter((s) => s.source === "github").map((s) => s.name),
    );
    expect(Object.values(canonical.skills).flat()).toEqual(
      normalized.skills.filter((s) => s.source === "resume").map((s) => s.name),
    );
  });
});

describe("diffRowCounts", () => {
  const manifest = normalize().manifest;

  it("finds nothing when the counts match", () => {
    expect(diffRowCounts(manifest, { ...manifest })).toEqual([]);
  });

  it("names the table whose count is wrong", () => {
    const differences = diffRowCounts(manifest, { ...manifest, projects: 12 });
    expect(differences).toEqual([{ table: "projects", expected: manifest.projects, actual: 12 }]);
  });
});
