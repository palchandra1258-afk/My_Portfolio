// Phase 7B-1 — tests for the Validate step.
//
// Two halves:
//   1. the real content passes cleanly, and
//   2. each check actually fires when its precondition is broken.
//
// (2) matters more than (1): a validator that never rejects anything would
// still satisfy (1) while letting a constraint violation reach PostgreSQL.
// Every mutation below is made on a deep clone, so no test can affect another
// or touch the real content modules.

import { describe, expect, it } from "vitest";

import { normalize, type NormalizedData } from "./normalize";
import { validate } from "./validate";

function clone(): NormalizedData {
  const data = normalize();
  return {
    ...structuredClone({
      projects: data.projects,
      technologies: data.technologies,
      profile: data.profile,
      manifest: data.manifest,
    }),
    // Map survives structuredClone, but rebuild it explicitly so mutations to
    // project technologies below stay reflected where a test needs them to be.
    technologyCaseIndex: new Map(data.technologyCaseIndex),
  };
}

function codes(data: NormalizedData): string[] {
  return validate(data).issues.map((i) => i.code);
}

describe("validate — real content", () => {
  it("passes with no errors", () => {
    const result = validate(normalize());
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("reports no technology case collisions today", () => {
    const result = validate(normalize());
    expect(result.warnings.filter((w) => w.code === "technology_case_collision")).toEqual([]);
  });
});

describe("validate — constraint preconditions", () => {
  it("rejects a self-referencing relationship (Constraint A)", () => {
    const data = clone();
    const project = data.projects.find((p) => p.relationships.length > 0);
    if (project === undefined) throw new Error("fixture requires a project with relationships");
    project.relationships[0].relatedSlug = project.slug;
    expect(codes(data)).toContain("self_relationship");
  });

  it("rejects a duplicate relationship pair (UNIQUE source, related)", () => {
    const data = clone();
    const project = data.projects.find((p) => p.relationships.length > 0);
    if (project === undefined) throw new Error("fixture requires a project with relationships");
    project.relationships.push({
      relatedSlug: project.relationships[0].relatedSlug,
      note: "duplicate",
      displayOrder: project.relationships.length,
    });
    expect(codes(data)).toContain("duplicate_relationship_pair");
  });

  it("rejects a profile id other than 1 (Constraint B)", () => {
    const data = clone();
    (data.profile as { id: number }).id = 2;
    expect(codes(data)).toContain("profile_id_not_one");
  });

  it("rejects a duplicate project slug (UNIQUE projects.slug)", () => {
    const data = clone();
    data.projects[1].slug = data.projects[0].slug;
    expect(codes(data)).toContain("duplicate_project_slug");
  });

  it("rejects the same technology twice within one project", () => {
    const data = clone();
    const project = data.projects.find((p) => p.technologies.length > 0);
    if (project === undefined) throw new Error("fixture requires a project with technologies");
    project.technologies.push({
      name: project.technologies[0].name,
      displayOrder: project.technologies.length,
    });
    expect(codes(data)).toContain("duplicate_technology_in_project");
  });
});

describe("validate — referential integrity", () => {
  it("rejects a relatedTo slug that matches no project", () => {
    const data = clone();
    const project = data.projects.find((p) => p.relationships.length > 0);
    if (project === undefined) throw new Error("fixture requires a project with relationships");
    project.relationships[0].relatedSlug = "no-such-project";
    expect(codes(data)).toContain("unresolved_relationship_slug");
  });

  it("rejects a technology referenced by a project but missing from the registry", () => {
    const data = clone();
    data.projects[0].technologies.push({
      name: "Unregistered Technology",
      displayOrder: data.projects[0].technologies.length,
    });
    expect(codes(data)).toContain("technology_missing_from_registry");
  });
});

describe("validate — ordering and required fields", () => {
  it("rejects a non-contiguous displayOrder sequence", () => {
    const data = clone();
    const project = data.projects.find((p) => p.technologies.length > 2);
    if (project === undefined) throw new Error("fixture requires a project with 3+ technologies");
    project.technologies[1].displayOrder = 99;
    expect(codes(data)).toContain("display_order_not_contiguous");
  });

  it("rejects a blank required field", () => {
    const data = clone();
    data.projects[0].title = "   ";
    expect(codes(data)).toContain("required_field_blank");
  });

  it("rejects a blank content list item", () => {
    const data = clone();
    const project = data.projects.find((p) => p.contentListItems.length > 0);
    if (project === undefined) throw new Error("fixture requires a project with list items");
    project.contentListItems[0].body = "";
    expect(codes(data)).toContain("content_list_item_blank");
  });

  it("rejects an unknown enum value", () => {
    const data = clone();
    (data.projects[0] as { category: string }).category = "not-a-category";
    expect(codes(data)).toContain("unknown_enum_value");
  });
});

describe("validate — scope guard", () => {
  it("rejects a project count that does not match content/projects.ts", () => {
    const data = clone();
    data.projects.pop();
    expect(codes(data)).toContain("project_count_mismatch");
  });

  it("rejects a project documented as deliberately absent", () => {
    const data = clone();
    data.projects[0].title = "Portfolio Optimization & MPT";
    expect(codes(data)).toContain("deliberately_absent_project");
  });
});

describe("validate — skills provenance", () => {
  it("rejects a resume skill with no category", () => {
    const data = clone();
    const skill = data.profile.skills.find((s) => s.source === "resume");
    if (skill === undefined) throw new Error("fixture requires a resume skill");
    skill.category = null;
    expect(codes(data)).toContain("resume_skill_missing_category");
  });

  it("rejects a GitHub-verified skill that carries a category", () => {
    const data = clone();
    const skill = data.profile.skills.find((s) => s.source === "github");
    if (skill === undefined) throw new Error("fixture requires a github skill");
    skill.category = "Programming";
    expect(codes(data)).toContain("github_skill_has_category");
  });
});

describe("validate — technology case collisions", () => {
  it("warns rather than errors, and does not merge the variants", () => {
    const data = clone();
    data.technologyCaseIndex.set("python", ["Python", "python"]);
    const result = validate(data);
    const collisions = result.warnings.filter((w) => w.code === "technology_case_collision");
    expect(collisions).toHaveLength(1);
    expect(result.errors.filter((e) => e.code === "technology_case_collision")).toEqual([]);
    // A warning must not block the import.
    expect(result.ok).toBe(true);
  });
});
