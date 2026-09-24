// Tests for snapshot → validated edit — Phase 10 (restore).
//
// Pure: FormData in, a result out. No database, no session, no Next.js, so
// every branch runs under the default `npm test`. The transactional half of
// restore is covered by lib/repositories/admin-project-repository.db.test.ts.

import { describe, expect, it } from "vitest";

import { parseSnapshotForRestore, restoreFormData } from "@/lib/admin/restore";
import type { ProjectSnapshot } from "@/lib/repositories/revision-repository.server";
import type { Project } from "@/lib/types";

function project(overrides: Partial<Project> = {}): Project {
  return {
    slug: "example-project",
    title: "Example Project",
    category: "supporting",
    status: "Completed",
    featured: false,
    shortDescription: "A short description.",
    technologies: ["TypeScript", "PostgreSQL"],
    metrics: [],
    evidenceStatus: "self-reported",
    verificationNotes: "Checked the repository.",
    source: "GitHub",
    ...overrides,
  } as Project;
}

function snapshot(overrides: Partial<ProjectSnapshot> = {}): ProjectSnapshot {
  return {
    project: project(),
    displayOrder: 3,
    publicationStatus: "draft",
    publishedAt: null,
    contentOrigin: "cms",
    ...overrides,
  };
}

describe("restoreFormData", () => {
  it("carries the snapshot's content fields across", () => {
    const form = restoreFormData(snapshot(), "draft");

    expect(form.get("slug")).toBe("example-project");
    expect(form.get("title")).toBe("Example Project");
    expect(form.get("category")).toBe("supporting");
    expect(form.get("status")).toBe("Completed");
    expect(form.get("source")).toBe("GitHub");
    expect(form.get("shortDescription")).toBe("A short description.");
    expect(form.get("evidenceStatus")).toBe("self-reported");
    expect(form.get("verificationNotes")).toBe("Checked the repository.");
    expect(form.get("displayOrder")).toBe("3");
  });

  it("joins technologies the way the textarea would present them", () => {
    const form = restoreFormData(snapshot(), "draft");
    expect(form.get("technologies")).toBe("TypeScript\nPostgreSQL");
  });

  it("omits `featured` entirely when the snapshot was not featured", () => {
    // Not a cosmetic detail: parseProjectForm reads this as
    // `form.get("featured") !== null`, so the string "false" would restore a
    // plain project as a featured one.
    expect(restoreFormData(snapshot(), "draft").get("featured")).toBeNull();
    expect(
      restoreFormData(snapshot({ project: project({ featured: true }) }), "draft").get("featured"),
    ).not.toBeNull();
  });

  it("uses the CURRENT publication status, never the snapshot's", () => {
    // The whole point of restore being a content operation: a revision taken
    // while the project was published must not push old content live.
    const fromPublished = snapshot({ publicationStatus: "published" });
    expect(restoreFormData(fromPublished, "draft").get("publicationStatus")).toBe("draft");

    // And the mirror case: restoring a draft-era revision must not take a
    // live project down.
    const fromDraft = snapshot({ publicationStatus: "draft" });
    expect(restoreFormData(fromDraft, "published").get("publicationStatus")).toBe("published");
  });

  it("represents absent links as blank, which the parser reads as null", () => {
    const form = restoreFormData(snapshot(), "draft");
    expect(form.get("githubUrl")).toBe("");
    expect(form.get("demoUrl")).toBe("");
  });
});

describe("parseSnapshotForRestore", () => {
  it("accepts a well-formed snapshot and returns editor values", () => {
    const result = parseSnapshotForRestore(snapshot(), "draft");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.title).toBe("Example Project");
    expect(result.values.technologies).toEqual(["TypeScript", "PostgreSQL"]);
    expect(result.values.featured).toBe(false);
    expect(result.values.githubUrl).toBeNull();
  });

  it("preserves the internal verification notes through the round trip", () => {
    const result = parseSnapshotForRestore(
      snapshot({ project: project({ verificationNotes: "Internal. [NEEDS VERIFICATION]" }) }),
      "draft",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.verificationNotes).toBe("Internal. [NEEDS VERIFICATION]");
  });

  it("rejects a snapshot whose vocabulary is no longer valid", () => {
    // A revision stored before a vocabulary changed must not be written back
    // into a column whose CHECK constraint would now refuse it — and must not
    // be silently coerced to some nearby member either.
    const result = parseSnapshotForRestore(
      snapshot({ project: project({ category: "retired-category" as Project["category"] }) }),
      "draft",
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.category).toBeDefined();
  });

  it("rejects a snapshot missing a required field rather than inventing one", () => {
    const result = parseSnapshotForRestore(
      snapshot({ project: project({ shortDescription: "" }) }),
      "draft",
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.shortDescription).toBeDefined();
  });

  it("rejects a structurally broken snapshot instead of throwing", () => {
    // Hand-edited row, truncated write, or a shape from a schema this code no
    // longer knows. The operator gets field errors; nothing reaches Prisma.
    const result = parseSnapshotForRestore(
      { project: null, displayOrder: 0 } as unknown as ProjectSnapshot,
      "draft",
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.slug).toBeDefined();
    expect(result.errors.title).toBeDefined();
  });

  it("rejects a dangerous URL smuggled into a snapshot", () => {
    const result = parseSnapshotForRestore(
      snapshot({ project: project({ demoUrl: "javascript:alert(1)" }) }),
      "draft",
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.demoUrl).toBeDefined();
  });

  it("drops non-string technologies rather than coercing them", () => {
    const result = parseSnapshotForRestore(
      snapshot({
        project: project({ technologies: ["TypeScript", { name: "x" }] as unknown as string[] }),
      }),
      "draft",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.technologies).toEqual(["TypeScript"]);
  });
});
