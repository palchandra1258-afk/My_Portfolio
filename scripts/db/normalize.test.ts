// Phase 7B-1 — tests for the Normalize step.
//
// The one thing normalization must guarantee is that it changes nothing. Every
// test below is a fidelity test: same values, same order, same counts as
// content/projects.ts and content/resume-data.ts.

import { describe, expect, it } from "vitest";

import { projects } from "@/content/projects";
import {
  achievements,
  additionalVerifiedSkills,
  education,
  experience,
  financeAreas,
  personal,
  skills,
  technologyXFinanceAreas,
} from "@/content/resume-data";

import {
  CATEGORY_MAP,
  EVIDENCE_MAP,
  IMPLEMENTATION_STATUS_MAP,
  METRIC_KIND_MAP,
  STATUS_MAP,
  normalize,
} from "./normalize";

const data = normalize();

describe("normalize — scope", () => {
  it("covers exactly the projects in content/projects.ts", () => {
    expect(data.projects).toHaveLength(projects.length);
    expect(data.projects.map((p) => p.slug)).toEqual(projects.map((p) => p.slug));
  });

  it("does not introduce Portfolio Optimization & MPT", () => {
    // docs/PROJECT_INVENTORY.md: deliberately absent, "Do not migrate it to
    // the database."
    const titles = data.projects.map((p) => `${p.title} ${p.slug}`.toLowerCase());
    expect(titles.some((t) => t.includes("portfolio optimization"))).toBe(false);
  });
});

describe("normalize — content fidelity", () => {
  it("copies every project scalar verbatim", () => {
    for (const [i, source] of projects.entries()) {
      const normalized = data.projects[i];
      expect(normalized.slug).toBe(source.slug);
      expect(normalized.title).toBe(source.title);
      expect(normalized.shortDescription).toBe(source.shortDescription);
      expect(normalized.verificationNotes).toBe(source.verificationNotes);
      expect(normalized.featured).toBe(source.featured);
      expect(normalized.source).toBe(source.source);
      expect(normalized.problem).toBe(source.problem ?? null);
      expect(normalized.approach).toBe(source.approach ?? null);
      expect(normalized.architecture).toBe(source.architecture ?? null);
      expect(normalized.githubUrl).toBe(source.githubUrl ?? null);
      expect(normalized.demoUrl).toBe(source.demoUrl ?? null);
    }
  });

  it("preserves technology order per project", () => {
    for (const [i, source] of projects.entries()) {
      expect(data.projects[i].technologies.map((t) => t.name)).toEqual(source.technologies);
      expect(data.projects[i].technologies.map((t) => t.displayOrder)).toEqual(
        source.technologies.map((_, j) => j),
      );
    }
  });

  it("preserves metric values, notes and sources without substitution", () => {
    for (const [i, source] of projects.entries()) {
      const normalized = data.projects[i].metrics;
      expect(normalized).toHaveLength(source.metrics.length);
      for (const [j, metric] of source.metrics.entries()) {
        expect(normalized[j].label).toBe(metric.label);
        expect(normalized[j].value).toBe(metric.value);
        expect(normalized[j].note).toBe(metric.note ?? null);
        expect(normalized[j].source).toBe(metric.source ?? null);
        expect(normalized[j].kind).toBe(METRIC_KIND_MAP[metric.kind]);
      }
    }
  });

  it("keeps the three ordered lists as independent sequences", () => {
    for (const [i, source] of projects.entries()) {
      const items = data.projects[i].contentListItems;
      const byType = (type: string) => items.filter((x) => x.listType === type).map((x) => x.body);
      expect(byType("results")).toEqual(source.results ?? []);
      expect(byType("what_is_working")).toEqual(source.whatIsWorking ?? []);
      expect(byType("what_is_in_development")).toEqual(source.whatIsInDevelopment ?? []);

      for (const type of ["results", "what_is_working", "what_is_in_development"]) {
        const orders = items.filter((x) => x.listType === type).map((x) => x.displayOrder);
        expect(orders).toEqual(orders.map((_, j) => j));
      }
    }
  });

  it("keeps relatedTo as slugs in source order", () => {
    for (const [i, source] of projects.entries()) {
      expect(data.projects[i].relationships.map((r) => r.relatedSlug)).toEqual(
        (source.relatedTo ?? []).map((r) => r.slug),
      );
      expect(data.projects[i].relationships.map((r) => r.note)).toEqual(
        (source.relatedTo ?? []).map((r) => r.note),
      );
    }
  });
});

describe("normalize — derived data", () => {
  it("derives displayOrder from array position", () => {
    expect(data.projects.map((p) => p.displayOrder)).toEqual(projects.map((_, i) => i));
  });

  it("maps every member of every TypeScript union to a Prisma enum identifier", () => {
    // Totality matters: a missing entry would produce `undefined` and the
    // insert would fail at the database, not here.
    for (const map of [
      CATEGORY_MAP,
      STATUS_MAP,
      EVIDENCE_MAP,
      METRIC_KIND_MAP,
      IMPLEMENTATION_STATUS_MAP,
    ]) {
      for (const value of Object.values(map)) {
        expect(typeof value).toBe("string");
        expect(value).not.toBe("");
      }
    }
  });
});

describe("normalize — technology registry", () => {
  it("deduplicates by exact name in first-seen order", () => {
    const names = data.technologies.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);

    const firstSeen: string[] = [];
    for (const project of projects) {
      for (const name of project.technologies) {
        if (!firstSeen.includes(name)) firstSeen.push(name);
      }
    }
    expect(names).toEqual(firstSeen);
  });

  it("indexes case variants instead of collapsing them", () => {
    for (const [key, variants] of data.technologyCaseIndex) {
      expect(key).toBe(key.toLowerCase());
      for (const variant of variants) expect(variant.toLowerCase()).toBe(key);
    }
  });

  it("registers every technology any project references", () => {
    const registry = new Set(data.technologies.map((t) => t.name));
    for (const project of projects) {
      for (const name of project.technologies) expect(registry.has(name)).toBe(true);
    }
  });
});

describe("normalize — profile", () => {
  it("fixes the profile id at 1 (Constraint B)", () => {
    expect(data.profile.id).toBe(1);
  });

  it("copies personal details verbatim", () => {
    expect(data.profile.name).toBe(personal.name);
    expect(data.profile.location).toBe(personal.location);
    expect(data.profile.phone).toBe(personal.phone);
    expect(data.profile.email).toBe(personal.email);
    expect(data.profile.githubUrl).toBe(personal.github);
    expect(data.profile.linkedinUrl).toBe(personal.linkedin);
    expect(data.profile.summary).toBe(personal.summary);
  });

  it("preserves education, experience, achievements and finance areas in order", () => {
    expect(data.profile.education.map((e) => e.institution)).toEqual(
      education.map((e) => e.institution),
    );
    expect(data.profile.education.map((e) => e.detail)).toEqual(
      education.map((e) => e.detail ?? null),
    );
    expect(data.profile.experience.map((x) => x.title)).toEqual(experience.map((x) => x.title));
    expect(data.profile.experience[0].highlights.map((h) => h.body)).toEqual(experience[0].bullets);
    expect(data.profile.achievements.map((a) => a.detail)).toEqual(achievements.map((a) => a.detail));
    expect(data.profile.financeAreas.map((f) => f.title)).toEqual(financeAreas.map((f) => f.title));
    expect(data.profile.technologyFinanceAreas.map((t) => t.label)).toEqual([
      ...technologyXFinanceAreas,
    ]);
  });

  it("keeps resume and GitHub skill provenance separate", () => {
    const resumeSkills = data.profile.skills.filter((s) => s.source === "resume");
    const githubSkills = data.profile.skills.filter((s) => s.source === "github");

    expect(resumeSkills.map((s) => s.name)).toEqual(Object.values(skills).flat());
    expect(githubSkills.map((s) => s.name)).toEqual([...additionalVerifiedSkills]);

    // A GitHub-verified skill must never acquire a resume category — that
    // would imply it came from the resume (content/resume-data.ts).
    for (const skill of githubSkills) expect(skill.category).toBeNull();
    for (const skill of resumeSkills) expect(skill.category).not.toBeNull();
  });

  it("rebuilds the original category grouping from the flattened resume skills", () => {
    const rebuilt: Record<string, string[]> = {};
    for (const skill of data.profile.skills.filter((s) => s.source === "resume")) {
      (rebuilt[skill.category as string] ??= []).push(skill.name);
    }
    expect(rebuilt).toEqual(
      Object.fromEntries(Object.entries(skills).map(([k, v]) => [k, [...v]])),
    );
  });
});

describe("normalize — manifest", () => {
  it("counts rows consistently with the normalized structures", () => {
    const m = data.manifest;
    expect(m.projects).toBe(data.projects.length);
    expect(m.technologies).toBe(data.technologies.length);
    expect(m.profile).toBe(1);
    expect(m.project_metrics).toBe(
      data.projects.reduce((total, p) => total + p.metrics.length, 0),
    );
    expect(m.project_content_list_items).toBe(
      data.projects.reduce((total, p) => total + p.contentListItems.length, 0),
    );
    expect(m.project_technologies).toBe(
      data.projects.reduce((total, p) => total + p.technologies.length, 0),
    );
    expect(m.skills).toBe(data.profile.skills.length);
    expect(m.experience_highlights).toBe(
      data.profile.experience.reduce((total, x) => total + x.highlights.length, 0),
    );
  });
});
