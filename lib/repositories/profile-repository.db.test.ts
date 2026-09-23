// Contract tests — database-backed profile repository vs the authoritative
// TypeScript content. Requires a live PostgreSQL instance: run with
// `npm run test:db`, not `npm test`.
//
// Comparison goes through `canonicalSourceProfile()` and `diff` from
// lib/content/canonical.ts, the same helpers Phase 7B-1 used to certify the
// replica, rather than a second implementation that could disagree with the
// verifier.
//
// Read-only: nothing here writes to the database.

import { beforeAll, describe, expect, it } from "vitest";

import {
  achievements as tsAchievements,
  additionalVerifiedSkills as tsAdditionalSkills,
  education as tsEducation,
  experience as tsExperience,
  financeAreas as tsFinanceAreas,
  personal as tsPersonal,
  skills as tsSkills,
  technologyXFinanceAreas as tsTechFinanceAreas,
} from "@/content/resume-data";
import { canonicalSourceProfile, diff, type DatabaseProfile } from "@/lib/content/canonical";
import { getProfile } from "@/lib/repositories/profile-repository.server";

let profile: DatabaseProfile;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. These contract tests need the local portfolio_dev database; run them with `npm run test:db`.",
    );
  }
  const loaded = await getProfile();
  if (loaded === null) {
    throw new Error("No profile row found (profile.id = 1). Run `npm run db:import` first.");
  }
  profile = loaded;
});

describe("getProfile", () => {
  it("reconstructs the complete profile with no differences", () => {
    expect(diff(canonicalSourceProfile(), profile, "profile")).toEqual([]);
  });

  it("returns all eight sections, none missing or unexpected", () => {
    const expected = [
      "personal",
      "education",
      "experience",
      "achievements",
      "financeAreas",
      "technologyXFinanceAreas",
      "skills",
      "additionalVerifiedSkills",
    ].sort();
    expect(Object.keys(profile).sort()).toEqual(expected);
  });
});

describe("profile sections", () => {
  it("matches personal field for field", () => {
    expect(profile.personal).toEqual({
      name: tsPersonal.name,
      location: tsPersonal.location,
      phone: tsPersonal.phone,
      email: tsPersonal.email,
      github: tsPersonal.github,
      linkedin: tsPersonal.linkedin,
      summary: tsPersonal.summary,
    });
  });

  it("matches education in order, including the optional detail field", () => {
    expect(profile.education).toHaveLength(tsEducation.length);
    expect(diff(
      tsEducation.map((e) => ({
        institution: e.institution,
        degree: e.degree,
        duration: e.duration,
        detail: e.detail ?? null,
      })),
      profile.education,
      "profile.education",
    )).toEqual([]);
  });

  it("matches experience including highlight order", () => {
    expect(profile.experience).toHaveLength(tsExperience.length);
    expect(diff(
      tsExperience.map((x) => ({
        title: x.title,
        organization: x.organization,
        duration: x.duration,
        bullets: [...x.bullets],
      })),
      profile.experience,
      "profile.experience",
    )).toEqual([]);
  });

  it("matches achievements verbatim, including bracketed evidence markers", () => {
    // One achievement detail is "[NEEDS INFORMATION — ...]" in the source.
    // It must survive the round-trip unaltered, not be cleaned up.
    expect(diff(
      tsAchievements.map((a) => ({ title: a.title, context: a.context, detail: a.detail })),
      profile.achievements,
      "profile.achievements",
    )).toEqual([]);
  });

  it("matches financeAreas and technologyXFinanceAreas in order", () => {
    expect(diff(
      tsFinanceAreas.map((f) => ({ title: f.title, description: f.description })),
      profile.financeAreas,
      "profile.financeAreas",
    )).toEqual([]);
    expect(profile.technologyXFinanceAreas).toEqual([...tsTechFinanceAreas]);
  });
});

describe("skills", () => {
  it("preserves category grouping and key order", () => {
    // Object.entries(skills) drives the rendered category order on the home
    // and about pages, so key order is content, not incidental.
    expect(Object.keys(profile.skills)).toEqual(Object.keys(tsSkills));
  });

  it("preserves the skill order within every category", () => {
    for (const [category, names] of Object.entries(tsSkills)) {
      expect(profile.skills[category]).toEqual([...names]);
    }
  });

  it("keeps additionalVerifiedSkills separate and in order", () => {
    // The GitHub-verified list is deliberately distinct from the resume
    // skills, so the site never implies these came from the resume.
    expect(profile.additionalVerifiedSkills).toEqual([...tsAdditionalSkills]);
  });

  it("does not leak GitHub-verified skills into the resume categories", () => {
    const resumeSkillNames = Object.values(profile.skills).flat();
    for (const githubSkill of tsAdditionalSkills) {
      expect(resumeSkillNames).not.toContain(githubSkill);
    }
  });

  it("does not create a category for the GitHub-verified skills", () => {
    // Those rows carry a null category; an empty-string key would mean the
    // null had been coerced into a real grouping.
    expect(Object.keys(profile.skills)).not.toContain("");
  });
});
