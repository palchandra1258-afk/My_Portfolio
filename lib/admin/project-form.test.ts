// Tests for project form validation — Phase 7.
//
// This is the security boundary for every CMS write (CMS_SPECIFICATION.md
// §56), so the tests are written from the attacker's side as much as the
// typo'd-form side: the browser's `required`, `pattern` and `type="url"`
// attributes are trivially bypassed by posting straight at the server action,
// and every one of them has to be re-proved here.
//
// Pure and database-free, so all of it runs under `npm test`.

import { describe, expect, it } from "vitest";

import {
  SLUG_PATTERN,
  parseProjectForm,
  parseTechnologies,
  type ProjectFormValues,
} from "./project-form";

/** A complete, valid submission. Individual tests override one field at a time. */
function form(overrides: Record<string, string> = {}, omit: string[] = []): FormData {
  const base: Record<string, string> = {
    slug: "example-project",
    title: "Example Project",
    shortDescription: "A short description.",
    verificationNotes: "Checked the repository; metrics are self-reported.",
    category: "supporting",
    status: "Completed",
    source: "GitHub",
    evidenceStatus: "self-reported",
    publicationStatus: "draft",
    technologies: "TypeScript\nPostgreSQL",
    githubUrl: "",
    demoUrl: "",
    displayOrder: "3",
    ...overrides,
  };
  const data = new FormData();
  for (const [key, value] of Object.entries(base)) {
    if (omit.includes(key)) continue;
    data.set(key, value);
  }
  return data;
}

function values(data: FormData): ProjectFormValues {
  const result = parseProjectForm(data);
  if (!result.ok) throw new Error(`Expected valid form, got: ${JSON.stringify(result.errors)}`);
  return result.values;
}

function errorsOf(data: FormData) {
  const result = parseProjectForm(data);
  if (result.ok) throw new Error("Expected the form to be rejected.");
  return result.errors;
}

describe("a valid submission", () => {
  it("is accepted and returns normalized values", () => {
    const parsed = values(form());
    expect(parsed.slug).toBe("example-project");
    expect(parsed.title).toBe("Example Project");
    expect(parsed.displayOrder).toBe(3);
    expect(parsed.publicationStatus).toBe("draft");
    expect(parsed.technologies).toEqual(["TypeScript", "PostgreSQL"]);
  });

  it("trims whitespace rather than storing it", () => {
    const parsed = values(form({ title: "  Padded Title  ", slug: "  a-slug  " }));
    expect(parsed.title).toBe("Padded Title");
    expect(parsed.slug).toBe("a-slug");
  });

  it("lowercases a slug typed in capitals", () => {
    expect(values(form({ slug: "Mixed-Case-Slug" })).slug).toBe("mixed-case-slug");
  });

  it("treats an absent checkbox as false and a present one as true", () => {
    // An unchecked checkbox is simply not submitted — it is never "false".
    expect(values(form({}, ["featured"])).featured).toBe(false);
    expect(values(form({ featured: "on" })).featured).toBe(true);
  });

  it("returns null, not an empty string, for blank optional links", () => {
    const parsed = values(form({ githubUrl: "", demoUrl: "" }));
    expect(parsed.githubUrl).toBeNull();
    expect(parsed.demoUrl).toBeNull();
  });
});

describe("required fields", () => {
  it.each([
    ["title", "title"],
    ["slug", "slug"],
    ["shortDescription", "shortDescription"],
  ])("rejects a blank %s", (field, key) => {
    expect(errorsOf(form({ [field]: "" }))).toHaveProperty(key);
  });

  it("rejects a field that is only whitespace", () => {
    expect(errorsOf(form({ title: "   " }))).toHaveProperty("title");
  });

  it("rejects a missing field entirely, not just a blank one", () => {
    expect(errorsOf(form({}, ["title"]))).toHaveProperty("title");
  });

  it("never substitutes a placeholder for a missing required value", () => {
    // Requirement: an empty submission must not silently replace existing
    // content with invented filler.
    const result = parseProjectForm(form({ shortDescription: "" }));
    expect(result.ok).toBe(false);
  });

  it("reports every problem at once rather than one per round-trip", () => {
    const errors = errorsOf(form({ title: "", slug: "", shortDescription: "" }));
    expect(Object.keys(errors).sort()).toEqual(["shortDescription", "slug", "title"]);
  });
});

describe("internal verification notes", () => {
  it("accepts a blank value, so the admin can clear them", () => {
    // They are internal, admin-only working notes. "There is nothing to note"
    // is a legitimate edit, and refusing it would leave stale text stuck on
    // the record with no way to remove it.
    const parsed = values(form({ verificationNotes: "" }));
    expect(parsed.verificationNotes).toBe("");
  });

  it("accepts a whitespace-only value as cleared rather than storing spaces", () => {
    expect(values(form({ verificationNotes: "   \n  " })).verificationNotes).toBe("");
  });

  it("treats the field as cleared when it is not submitted at all", () => {
    expect(values(form({}, ["verificationNotes"])).verificationNotes).toBe("");
  });

  it("keeps the submitted text verbatim, markers included", () => {
    const text = "Repo located. Accuracy [NEEDS VERIFICATION]. Dataset [NEEDS INFORMATION].";
    expect(values(form({ verificationNotes: text })).verificationNotes).toBe(text);
  });

  it("still bounds the length", () => {
    expect(errorsOf(form({ verificationNotes: "a".repeat(5001) }))).toHaveProperty(
      "verificationNotes",
    );
  });
});

describe("slug validation", () => {
  it.each(["a", "abc", "a-b", "project-1", "the-inevitable", "atdl2"])("accepts %s", (slug) => {
    expect(SLUG_PATTERN.test(slug)).toBe(true);
    expect(parseProjectForm(form({ slug })).ok).toBe(true);
  });

  it.each([
    ["with spaces", "two words"],
    ["leading hyphen", "-leading"],
    ["trailing hyphen", "trailing-"],
    ["double hyphen", "double--hyphen"],
    ["underscore", "snake_case"],
    ["slash", "path/traversal"],
    ["dot", "file.ext"],
    ["percent-encoding", "a%20b"],
    ["unicode", "café"],
    ["query string", "a?b=c"],
  ])("rejects a slug %s", (_label, slug) => {
    expect(errorsOf(form({ slug }))).toHaveProperty("slug");
  });

  it("rejects an over-long slug", () => {
    expect(errorsOf(form({ slug: "a".repeat(101) }))).toHaveProperty("slug");
  });
});

describe("controlled vocabularies", () => {
  it.each([
    ["category", "not-a-category"],
    ["status", "Shipped"],
    ["source", "Twitter"],
    ["evidenceStatus", "totally-verified"],
    ["publicationStatus", "live"],
  ])("rejects a tampered %s", (field, value) => {
    // A <select> cannot produce these. A crafted POST can.
    expect(errorsOf(form({ [field]: value }))).toHaveProperty(field);
  });

  it("rejects an evidence status the editor deliberately does not offer", () => {
    // lib/types.ts retains `in-development` and `planned` for compatibility
    // and tells new projects not to use them.
    expect(errorsOf(form({ evidenceStatus: "in-development" }))).toHaveProperty("evidenceStatus");
  });

  it("accepts every value the editor does offer", () => {
    for (const value of ["verified", "partially-verified", "self-reported", "unpublished", "needs-information"]) {
      expect(parseProjectForm(form({ evidenceStatus: value })).ok).toBe(true);
    }
  });
});

describe("technologies", () => {
  it("splits on newlines and commas alike", () => {
    expect(parseTechnologies("A\nB, C\nD")).toEqual(["A", "B", "C", "D"]);
  });

  it("trims each entry and drops blank lines", () => {
    expect(parseTechnologies("  A  \n\n , ,  B ")).toEqual(["A", "B"]);
  });

  it("removes case-insensitive duplicates, keeping the first spelling", () => {
    // `technologies.name` is case-sensitive unique in the schema, so letting
    // both through would create two rows for one technology.
    expect(parseTechnologies("PyTorch\npytorch\nPYTORCH")).toEqual(["PyTorch"]);
  });

  it("accepts an empty list", () => {
    expect(values(form({ technologies: "" })).technologies).toEqual([]);
  });

  it("rejects an absurdly long single technology", () => {
    expect(errorsOf(form({ technologies: "x".repeat(81) }))).toHaveProperty("technologies");
  });

  it("rejects an unreasonable number of technologies", () => {
    const many = Array.from({ length: 61 }, (_, i) => `tech-${i}`).join("\n");
    expect(errorsOf(form({ technologies: many }))).toHaveProperty("technologies");
  });
});

describe("links", () => {
  it("accepts http and https", () => {
    const parsed = values(
      form({ githubUrl: "https://github.com/a/b", demoUrl: "http://example.com" }),
    );
    expect(parsed.githubUrl).toBe("https://github.com/a/b");
    expect(parsed.demoUrl).toBe("http://example.com/");
  });

  it.each([
    ["javascript:", "javascript:alert(1)"],
    ["data:", "data:text/html,<script>alert(1)</script>"],
    ["file:", "file:///etc/passwd"],
    ["no scheme", "github.com/a/b"],
    ["nonsense", "not a url"],
  ])("rejects a %s URL", (_label, url) => {
    // These values are rendered as link hrefs on the public site.
    expect(errorsOf(form({ githubUrl: url }))).toHaveProperty("githubUrl");
  });

  it("rejects an over-long URL", () => {
    expect(errorsOf(form({ demoUrl: `https://example.com/${"a".repeat(500)}` }))).toHaveProperty(
      "demoUrl",
    );
  });
});

describe("display order", () => {
  it("accepts zero and positive integers", () => {
    expect(values(form({ displayOrder: "0" })).displayOrder).toBe(0);
    expect(values(form({ displayOrder: "12" })).displayOrder).toBe(12);
  });

  it.each([
    ["negative", "-1"],
    ["fractional", "1.5"],
    ["non-numeric", "first"],
    ["blank", ""],
    ["out of range", "10000"],
  ])("rejects a %s display order", (_label, value) => {
    expect(errorsOf(form({ displayOrder: value }))).toHaveProperty("displayOrder");
  });
});

describe("hostile input", () => {
  it("treats a File where a string was expected as absent", () => {
    const data = form();
    data.set("title", new File(["x"], "title.txt"));
    // Must not coerce to "[object File]" and save that as the title.
    expect(errorsOf(data)).toHaveProperty("title");
  });

  it("bounds every free-text field", () => {
    expect(errorsOf(form({ title: "a".repeat(201) }))).toHaveProperty("title");
    expect(errorsOf(form({ shortDescription: "a".repeat(1001) }))).toHaveProperty(
      "shortDescription",
    );
    expect(errorsOf(form({ verificationNotes: "a".repeat(5001) }))).toHaveProperty(
      "verificationNotes",
    );
  });

  it("preserves evidence markers verbatim instead of stripping them", () => {
    // These are meaningful content, not placeholders to be cleaned up.
    const parsed = values(
      form({ verificationNotes: "Dataset size [NEEDS INFORMATION]. Accuracy [NEEDS VERIFICATION]." }),
    );
    expect(parsed.verificationNotes).toContain("[NEEDS INFORMATION]");
    expect(parsed.verificationNotes).toContain("[NEEDS VERIFICATION]");
  });

  it("does not strip or escape ordinary punctuation in prose", () => {
    const text = "Uses <PyTorch> & \"quotes\" — plus 100% of the data.";
    expect(values(form({ shortDescription: text })).shortDescription).toBe(text);
  });
});
