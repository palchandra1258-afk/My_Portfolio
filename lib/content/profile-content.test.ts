// Unit tests for the profile validation contract — Phase 7B-2 Step 4.
//
// toProfileContent is the implementation of approved fallback Case D:
// reconstructed database data that does not match the expected shape must
// fail loudly, with the exact field path, never be coerced, and never
// trigger a fallback to TypeScript. Every assertion here is against that
// throw-with-path behavior, plus the one non-shape case (an absent profile
// row, which is Case C for the singleton).

import { describe, expect, it } from "vitest";

import type { DatabaseProfile } from "@/lib/content/canonical";
import { InvalidContentError, toProfileContent } from "@/lib/content/profile-content";

function validProfile(): DatabaseProfile {
  return {
    personal: {
      name: "Chandrapal",
      location: "Bengaluru, India",
      phone: "+91-00000-00000",
      email: "chandra@example.com",
      github: "https://github.com/example",
      linkedin: "https://linkedin.com/in/example",
      summary: "AI/ML engineer.",
    },
    education: [
      { institution: "Vidyashilp University", degree: "B.Sc. Data Science", duration: "2022–2026", detail: null },
    ],
    experience: [
      { title: "Intern", organization: "Zio Development", duration: "2024", bullets: ["Did a thing.", "Did another."] },
    ],
    achievements: [{ title: "Scholarship", context: "Merit", detail: "Top of cohort." }],
    financeAreas: [{ title: "Corporate Finance", description: "Capital structure." }],
    technologyXFinanceAreas: ["Algorithmic trading"],
    skills: { "Languages": ["Python", "TypeScript"], "ML": ["PyTorch"] },
    additionalVerifiedSkills: ["Docker"],
  };
}

describe("toProfileContent", () => {
  it("accepts a well-formed profile and preserves every field", () => {
    const content = toProfileContent(validProfile());
    expect(content.personal.name).toBe("Chandrapal");
    expect(content.education).toEqual([
      { institution: "Vidyashilp University", degree: "B.Sc. Data Science", duration: "2022–2026", detail: null },
    ]);
    expect(content.experience[0].bullets).toEqual(["Did a thing.", "Did another."]);
    expect(content.skills).toEqual({ "Languages": ["Python", "TypeScript"], "ML": ["PyTorch"] });
    expect(content.additionalVerifiedSkills).toEqual(["Docker"]);
  });

  it("preserves skills key order rather than sorting it", () => {
    const profile = validProfile();
    profile.skills = { "Zeta": ["z"], "Alpha": ["a"], "Mid": ["m"] };
    const content = toProfileContent(profile);
    expect(Object.keys(content.skills)).toEqual(["Zeta", "Alpha", "Mid"]);
  });

  it("preserves a nullable detail field as null rather than requiring a string", () => {
    const profile = validProfile();
    profile.education[0] = { ...(profile.education[0] as Record<string, unknown>), detail: null };
    const content = toProfileContent(profile);
    expect(content.education[0].detail).toBeNull();
  });

  it("throws InvalidContentError with the profile.id=1 explanation when the row is absent", () => {
    expect(() => toProfileContent(null)).toThrow(InvalidContentError);
    expect(() => toProfileContent(null)).toThrow(/profile\.id = 1 is absent/);
  });

  it("throws with the exact field path when a required string is the wrong type", () => {
    const profile = validProfile();
    (profile.personal as unknown as Record<string, unknown>).name = 123;
    expect(() => toProfileContent(profile)).toThrow(/profile\.personal\.name/);
  });

  it("throws with the exact field path for a malformed list entry", () => {
    const profile = validProfile();
    profile.experience = [{ title: "Intern", organization: "X", duration: "2024" /* bullets missing */ }];
    expect(() => toProfileContent(profile)).toThrow(/profile\.experience\[0\]\.bullets/);
  });

  it("throws when a list entry is not an object at all", () => {
    const profile = validProfile();
    (profile.achievements as unknown[]) = ["not an object"];
    expect(() => toProfileContent(profile)).toThrow(/profile\.achievements\[0\]/);
  });

  it("throws when a top-level list is not an array", () => {
    const profile = validProfile();
    (profile.financeAreas as unknown) = "not an array";
    expect(() => toProfileContent(profile)).toThrow(/profile\.financeAreas/);
  });

  it("does not coerce a number into a string field", () => {
    const profile = validProfile();
    (profile.personal as unknown as Record<string, unknown>).phone = 9999999999;
    expect(() => toProfileContent(profile)).toThrow(InvalidContentError);
  });

  it("throws when a string-array field contains a non-string element", () => {
    const profile = validProfile();
    (profile.additionalVerifiedSkills as unknown[]) = ["Docker", 42];
    expect(() => toProfileContent(profile)).toThrow(/profile\.additionalVerifiedSkills\[1\]/);
  });
});
