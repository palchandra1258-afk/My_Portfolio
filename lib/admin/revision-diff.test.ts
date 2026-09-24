// Tests for snapshot comparison — Phase 10 (revision comparison).
//
// Pure: snapshots in, plain strings out. No database, no session, no Next.js,
// so every branch runs under the default `npm test`.

import { describe, expect, it } from "vitest";

import { compareSnapshots } from "@/lib/admin/revision-diff";
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

/** The comparison row for one field, by key. */
function row(result: ReturnType<typeof compareSnapshots>, field: string) {
  return [...result.content, ...result.state].find((entry) => entry.field === field)!;
}

describe("identical revisions", () => {
  it("reports nothing changed when the snapshots match", () => {
    const result = compareSnapshots(snapshot(), snapshot());

    expect(result.identical).toBe(true);
    expect(result.changedCount).toBe(0);
    expect(result.content.every((entry) => !entry.changed)).toBe(true);
  });

  it("still returns every field, so unchanged values remain visible", () => {
    // §58 asks for changed fields to be highlighted within the comparison,
    // not for the unchanged ones to be hidden.
    const result = compareSnapshots(snapshot(), snapshot());

    expect(result.content.length).toBeGreaterThan(10);
    expect(row(result, "title").before).toBe("Example Project");
    expect(row(result, "title").after).toBe("Example Project");
  });

  it("treats a snapshot compared with itself as identical, not as an error", () => {
    const one = snapshot();
    expect(compareSnapshots(one, one).identical).toBe(true);
  });
});

describe("field-level differences", () => {
  it("marks only the fields that actually moved", () => {
    const result = compareSnapshots(
      snapshot({ project: project({ title: "Before" }) }),
      snapshot({ project: project({ title: "After" }) }),
    );

    expect(result.identical).toBe(false);
    expect(result.changedCount).toBe(1);
    expect(row(result, "title")).toMatchObject({
      before: "Before",
      after: "After",
      changed: true,
    });
    expect(row(result, "slug").changed).toBe(false);
  });

  it("reports a boolean as Yes/No rather than as a missing value", () => {
    // `featured` is a checkbox, so the form projection omits it when false.
    // Read naively that would render as "changed: false → (empty)".
    const result = compareSnapshots(
      snapshot({ project: project({ featured: false }) }),
      snapshot({ project: project({ featured: true }) }),
    );

    expect(row(result, "featured")).toMatchObject({
      before: "No",
      after: "Yes",
      changed: true,
    });
  });

  it("reports a technology list as readable text", () => {
    const result = compareSnapshots(
      snapshot({ project: project({ technologies: ["TypeScript"] }) }),
      snapshot({ project: project({ technologies: ["TypeScript", "Rust"] }) }),
    );

    expect(row(result, "technologies")).toMatchObject({
      before: "TypeScript",
      after: "TypeScript, Rust",
      changed: true,
    });
  });

  it("shows a placeholder rather than an empty cell for an absent value", () => {
    const result = compareSnapshots(
      snapshot({ project: project({ githubUrl: undefined }) }),
      snapshot({ project: project({ githubUrl: "https://example.com/repo" }) }),
    );

    expect(row(result, "githubUrl").before).toBe("—");
    expect(row(result, "githubUrl").after).toBe("https://example.com/repo");
  });

  it("compares the internal verification notes, which are admin-only", () => {
    const result = compareSnapshots(
      snapshot({ project: project({ verificationNotes: "Old note." }) }),
      snapshot({ project: project({ verificationNotes: "" }) }),
    );

    expect(row(result, "verificationNotes")).toMatchObject({
      before: "Old note.",
      after: "—",
      changed: true,
    });
  });

  it("detects several changes at once and counts them", () => {
    const result = compareSnapshots(
      snapshot({ project: project({ title: "A", category: "supporting" }), displayOrder: 1 }),
      snapshot({ project: project({ title: "B", category: "research" }), displayOrder: 2 }),
    );

    expect(result.changedCount).toBe(3);
    expect(row(result, "displayOrder")).toMatchObject({ before: "1", after: "2" });
  });

  it("marks prose fields as multiline so they are not squeezed into a cell", () => {
    const result = compareSnapshots(snapshot(), snapshot());

    expect(row(result, "shortDescription").multiline).toBe(true);
    expect(row(result, "verificationNotes").multiline).toBe(true);
    expect(row(result, "title").multiline).toBe(false);
  });
});

describe("recorded state is reported separately from content", () => {
  it("keeps publication status out of the content group", () => {
    // Restore does not write it, so counting it as a content change would
    // tell the operator a restore is about to do something it will not do.
    const result = compareSnapshots(
      snapshot({ publicationStatus: "draft" }),
      snapshot({ publicationStatus: "published" }),
    );

    expect(result.identical).toBe(true);
    expect(result.changedCount).toBe(0);
    expect(result.content.some((entry) => entry.field === "publicationStatus")).toBe(false);
    expect(row(result, "publicationStatus")).toMatchObject({
      before: "draft",
      after: "published",
      changed: true,
    });
  });

  it("reports published_at and content origin as state, not content", () => {
    const result = compareSnapshots(
      snapshot({ publishedAt: null, contentOrigin: "typescript_import" }),
      snapshot({ publishedAt: "2026-01-02T03:04:05.000Z", contentOrigin: "cms" }),
    );

    expect(result.identical).toBe(true);
    expect(row(result, "publishedAt")).toMatchObject({ before: "—", after: "2026-01-02" });
    expect(row(result, "contentOrigin")).toMatchObject({
      before: "TypeScript import",
      after: "CMS",
    });
  });

  it("agrees with restore about which fields are content", () => {
    // The structural guarantee this module exists to keep: every field in the
    // content group is one restoreProjectRevisionWithin writes, and the three
    // it leaves alone are all in the state group.
    const result = compareSnapshots(snapshot(), snapshot());
    const contentFields = result.content.map((entry) => entry.field);

    expect(contentFields).not.toContain("publicationStatus");
    expect(contentFields).not.toContain("publishedAt");
    expect(contentFields).not.toContain("contentOrigin");
    expect(result.state.map((entry) => entry.field)).toEqual([
      "publicationStatus",
      "publishedAt",
      "contentOrigin",
    ]);
  });
});

describe("malformed snapshots", () => {
  it("renders a structurally broken snapshot instead of throwing", () => {
    // An operator looking at damaged history needs to see the damage, not a
    // 500. Comparison is read-only, so there is nothing unsafe about showing
    // whatever is actually stored.
    const result = compareSnapshots(
      { project: null, displayOrder: 0 } as unknown as ProjectSnapshot,
      snapshot(),
    );

    expect(row(result, "title").before).toBe("—");
    expect(row(result, "title").after).toBe("Example Project");
    expect(row(result, "featured").before).toBe("No");
  });

  it("survives a snapshot with no recorded state at all", () => {
    const result = compareSnapshots({} as unknown as ProjectSnapshot, snapshot());

    expect(row(result, "publicationStatus").before).toBe("—");
    expect(row(result, "publishedAt").before).toBe("—");
    expect(row(result, "contentOrigin").before).toBe("—");
  });

  it("returns only strings, so nothing can reach the DOM as markup", () => {
    const result = compareSnapshots(
      snapshot({
        project: project({ title: "<script>alert(1)</script>" as string }),
      }),
      snapshot(),
    );

    for (const entry of [...result.content, ...result.state]) {
      expect(typeof entry.before).toBe("string");
      expect(typeof entry.after).toBe("string");
    }
    // Carried through verbatim: React escapes it when rendered as a child.
    expect(row(result, "title").before).toBe("<script>alert(1)</script>");
  });
});
