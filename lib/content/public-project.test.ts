// Tests for the public projection.
//
// The property under test is a privacy boundary, not a formatting detail:
// `verificationNotes` is internal editorial material — it names what could not
// be verified and which claims are the owner's word — and it must not reach a
// visitor in rendered text, in page source, or in the RSC payload.
//
// Two halves, both tested here:
//   1. the field is absent from the returned object at RUNTIME (a type-level
//      Omit would not stop React serializing it into the HTML response)
//   2. every other field survives untouched
//
// The last block runs against the real content/projects.ts, so the suite fails
// if a future project is added carrying notes that the projection forgets to
// strip.

import { describe, expect, it } from "vitest";

import { projects as realProjects } from "@/content/projects";
import {
  stripRelationships,
  toPublicProject,
  toPublicProjects,
} from "@/lib/content/public-project";
import type { Project } from "@/lib/types";

const SECRET = "INTERNAL: repository could not be located; metrics are unverified.";

function project(overrides: Partial<Project> = {}): Project {
  return {
    slug: "example",
    title: "Example",
    alternateNames: ["Alt"],
    category: "supporting",
    status: "Completed",
    featured: true,
    shortDescription: "A project.",
    problem: "The problem.",
    approach: "The approach.",
    architecture: "The architecture.",
    technologies: ["TypeScript"],
    results: ["A result."],
    metrics: [{ label: "Accuracy", value: "90%", kind: "verified-result" }],
    githubUrl: "https://github.com/a/b",
    demoUrl: "https://example.com",
    evidenceStatus: "self-reported",
    verificationNotes: SECRET,
    whatIsWorking: ["Working."],
    whatIsInDevelopment: ["In development."],
    implementationNotes: [{ label: "Retrieval", status: "specified" }],
    relatedTo: [{ slug: "other", note: "Related." }],
    source: "GitHub",
    ...overrides,
  };
}

describe("toPublicProject", () => {
  it("removes verificationNotes from the object, not merely from the type", () => {
    const result = toPublicProject(project());

    expect("verificationNotes" in result).toBe(false);
    expect(Object.keys(result)).not.toContain("verificationNotes");
  });

  it("leaves no trace of the notes anywhere in the serialized output", () => {
    // This is the form the field would take if it leaked: React serializes a
    // Server Component's props into the RSC flight payload embedded in the
    // HTML response, so a JSON round-trip is the honest check.
    const serialized = JSON.stringify(toPublicProject(project()));

    expect(serialized).not.toContain(SECRET);
    expect(serialized).not.toContain("verificationNotes");
  });

  it("preserves every other field exactly", () => {
    const source = project();
    const result = toPublicProject(source);

    // Spelled out rather than compared against an Omit helper, so a field
    // silently dropped by the projection fails here rather than in production.
    expect(result.slug).toBe(source.slug);
    expect(result.title).toBe(source.title);
    expect(result.alternateNames).toEqual(source.alternateNames);
    expect(result.category).toBe(source.category);
    expect(result.status).toBe(source.status);
    expect(result.featured).toBe(source.featured);
    expect(result.shortDescription).toBe(source.shortDescription);
    expect(result.problem).toBe(source.problem);
    expect(result.approach).toBe(source.approach);
    expect(result.architecture).toBe(source.architecture);
    expect(result.technologies).toEqual(source.technologies);
    expect(result.results).toEqual(source.results);
    expect(result.metrics).toEqual(source.metrics);
    expect(result.githubUrl).toBe(source.githubUrl);
    expect(result.demoUrl).toBe(source.demoUrl);
    expect(result.evidenceStatus).toBe(source.evidenceStatus);
    expect(result.whatIsWorking).toEqual(source.whatIsWorking);
    expect(result.whatIsInDevelopment).toEqual(source.whatIsInDevelopment);
    expect(result.implementationNotes).toEqual(source.implementationNotes);
    expect(result.relatedTo).toEqual(source.relatedTo);
    expect(result.source).toBe(source.source);
  });

  it("keeps the public evidence status, which is a deliberate public signal", () => {
    // Only the notes are internal. The status badge stays on the project page.
    expect(toPublicProject(project({ evidenceStatus: "needs-information" })).evidenceStatus).toBe(
      "needs-information",
    );
  });

  it("keeps evidence markers that appear in public fields", () => {
    // Markers in public prose are still published text and must not be
    // stripped as a side effect of hiding the notes.
    const result = toPublicProject(project({ problem: "Dataset size [NEEDS INFORMATION]." }));
    expect(result.problem).toContain("[NEEDS INFORMATION]");
  });

  it("does not mutate the project it was given", () => {
    const source = project();
    toPublicProject(source);
    expect(source.verificationNotes).toBe(SECRET);
  });

  it("handles a project whose optional fields are absent", () => {
    const minimal: Project = {
      slug: "minimal",
      title: "Minimal",
      category: "supporting",
      status: "Completed",
      featured: false,
      shortDescription: "Short.",
      technologies: [],
      metrics: [],
      evidenceStatus: "self-reported",
      verificationNotes: SECRET,
      source: "GitHub",
    };
    const result = toPublicProject(minimal);
    expect("verificationNotes" in result).toBe(false);
    expect(result.problem).toBeUndefined();
  });
});

describe("toPublicProjects", () => {
  it("projects every entry", () => {
    const results = toPublicProjects([project({ slug: "a" }), project({ slug: "b" })]);
    expect(results).toHaveLength(2);
    for (const result of results) expect("verificationNotes" in result).toBe(false);
  });
});

describe("stripRelationships", () => {
  // The article renders an already-resolved `related` prop. Carrying the raw
  // list alongside it would serialize the slug of every relationship target —
  // including unpublished ones — into the page without displaying them.
  it("removes relatedTo from the object at runtime", () => {
    const result = stripRelationships(
      toPublicProject(project({ relatedTo: [{ slug: "secret-draft", note: "hidden" }] })),
    );

    expect("relatedTo" in result).toBe(false);
    expect(JSON.stringify(result)).not.toContain("secret-draft");
  });

  it("keeps every other field", () => {
    const source = toPublicProject(project());
    const result = stripRelationships(source);

    expect(result.slug).toBe(source.slug);
    expect(result.title).toBe(source.title);
    expect(result.metrics).toEqual(source.metrics);
    expect(result.technologies).toEqual(source.technologies);
    expect(result.evidenceStatus).toBe(source.evidenceStatus);
  });

  it("does not mutate its argument", () => {
    const source = toPublicProject(project({ relatedTo: [{ slug: "x", note: "n" }] }));
    stripRelationships(source);
    expect(source.relatedTo).toEqual([{ slug: "x", note: "n" }]);
  });

  it("is harmless on a project with no relationships", () => {
    const result = stripRelationships(toPublicProject(project({ relatedTo: undefined })));
    expect("relatedTo" in result).toBe(false);
  });
});

describe("the real portfolio content", () => {
  it("strips the notes from all 13 projects", () => {
    const results = toPublicProjects(realProjects);
    expect(results).toHaveLength(13);
    for (const result of results) {
      expect("verificationNotes" in result, result.slug).toBe(false);
    }
  });

  it("leaves no real verification-note text in the serialized public output", () => {
    // The strongest form of the check: take the actual note text of every
    // project and prove none of it survives projection.
    const serialized = JSON.stringify(toPublicProjects(realProjects));

    for (const source of realProjects) {
      const notes = source.verificationNotes.trim();
      if (notes.length === 0) continue;
      // A distinctive slice — the whole string can be long, and a substring
      // match is the same test with a smaller needle.
      expect(serialized, `${source.slug} notes leaked`).not.toContain(notes.slice(0, 60));
    }
  });
});
