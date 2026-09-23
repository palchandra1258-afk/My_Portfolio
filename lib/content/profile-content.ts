// The profile shape the application renders, and the contract that guards it.
//
// Two things live here, and they exist for the same reason.
//
// 1. `ProfileContent` — a precise type for the consolidated profile. The
//    reconstruction in lib/repositories/read-model.ts returns `DatabaseProfile`,
//    whose list fields are typed `Canonical[]` (a plain JSON value). That is
//    fine for diffing, which is all Phase 7B-1 needed, but a page cannot render
//    `Canonical` — `entry.institution` is not a property of a union of JSON
//    values. `ProfileContent` names the fields the components actually read.
//
// 2. `toProfileContent` — the runtime check that earns that type. It is the
//    implementation of approved fallback Case D: database data that cannot be
//    reconstructed into the expected shape must fail loudly, never be coerced
//    and never trigger a fall back to TypeScript. So this validator does not
//    repair, default, or cast — it either recognizes the shape or throws with
//    the exact field path that failed.
//
// Pure and database-free: no Prisma, no lib/db, no *.server.ts import, so the
// whole contract is testable in the default `npm test` suite.

import type { DatabaseProfile } from "@/lib/content/canonical";

export interface PersonalContent {
  name: string;
  location: string;
  phone: string;
  email: string;
  github: string;
  linkedin: string;
  summary: string;
}

export interface EducationEntry {
  institution: string;
  degree: string;
  duration: string;
  detail: string | null;
}

export interface ExperienceEntry {
  title: string;
  organization: string;
  duration: string;
  bullets: string[];
}

export interface AchievementEntry {
  title: string;
  context: string;
  detail: string;
}

export interface FinanceAreaEntry {
  title: string;
  description: string;
}

/** Exactly the eight groups content/resume-data.ts exports, in one object. */
export interface ProfileContent {
  personal: PersonalContent;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  achievements: AchievementEntry[];
  financeAreas: FinanceAreaEntry[];
  technologyXFinanceAreas: string[];
  skills: Record<string, string[]>;
  additionalVerifiedSkills: string[];
}

/** Thrown when reconstructed content does not match the expected shape (Case D). */
export class InvalidContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidContentError";
  }
}

function fail(path: string, expected: string, actual: unknown): never {
  throw new InvalidContentError(
    `Profile content is not usable: ${path} should be ${expected}, got ${describe(actual)}. ` +
      "Refusing to coerce the value or substitute TypeScript content.",
  );
}

function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return `an array (length ${value.length})`;
  return typeof value;
}

function str(record: Record<string, unknown>, key: string, path: string): string {
  const value = record[key];
  if (typeof value !== "string") fail(`${path}.${key}`, "a string", value);
  return value;
}

function nullableStr(record: Record<string, unknown>, key: string, path: string): string | null {
  const value = record[key];
  if (value === null) return null;
  if (typeof value !== "string") fail(`${path}.${key}`, "a string or null", value);
  return value;
}

function strArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) fail(path, "an array of strings", value);
  return value.map((item, i) => {
    if (typeof item !== "string") fail(`${path}[${i}]`, "a string", item);
    return item;
  });
}

function objectAt(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(path, "an object", value);
  }
  return value as Record<string, unknown>;
}

function list(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path, "an array", value);
  return value;
}

/**
 * Narrow a reconstructed profile to `ProfileContent`, or throw.
 *
 * `null` means the profile row is absent. That is not a shape problem, so it
 * gets its own message: the singleton row's existence is guaranteed by the
 * import process, not by a constraint, so an empty table is a real state.
 */
export function toProfileContent(raw: DatabaseProfile | null): ProfileContent {
  if (raw === null) {
    throw new InvalidContentError(
      "No profile content was found (profile.id = 1 is absent). The profile row is " +
        "created by the content import, not by a database constraint — run `npm run db:import`.",
    );
  }

  const personalRaw = objectAt(raw.personal, "profile.personal");
  const personal: PersonalContent = {
    name: str(personalRaw, "name", "profile.personal"),
    location: str(personalRaw, "location", "profile.personal"),
    phone: str(personalRaw, "phone", "profile.personal"),
    email: str(personalRaw, "email", "profile.personal"),
    github: str(personalRaw, "github", "profile.personal"),
    linkedin: str(personalRaw, "linkedin", "profile.personal"),
    summary: str(personalRaw, "summary", "profile.personal"),
  };

  const education = list(raw.education, "profile.education").map((entry, i) => {
    const path = `profile.education[${i}]`;
    const e = objectAt(entry, path);
    return {
      institution: str(e, "institution", path),
      degree: str(e, "degree", path),
      duration: str(e, "duration", path),
      detail: nullableStr(e, "detail", path),
    };
  });

  const experience = list(raw.experience, "profile.experience").map((entry, i) => {
    const path = `profile.experience[${i}]`;
    const x = objectAt(entry, path);
    return {
      title: str(x, "title", path),
      organization: str(x, "organization", path),
      duration: str(x, "duration", path),
      bullets: strArray(x.bullets, `${path}.bullets`),
    };
  });

  const achievements = list(raw.achievements, "profile.achievements").map((entry, i) => {
    const path = `profile.achievements[${i}]`;
    const a = objectAt(entry, path);
    return {
      title: str(a, "title", path),
      context: str(a, "context", path),
      detail: str(a, "detail", path),
    };
  });

  const financeAreas = list(raw.financeAreas, "profile.financeAreas").map((entry, i) => {
    const path = `profile.financeAreas[${i}]`;
    const f = objectAt(entry, path);
    return {
      title: str(f, "title", path),
      description: str(f, "description", path),
    };
  });

  const skillsRaw = objectAt(raw.skills, "profile.skills");
  const skills: Record<string, string[]> = {};
  // Key order is content: it drives the rendered category order on the home and
  // about pages, so the object is rebuilt in iteration order, not sorted.
  for (const category of Object.keys(skillsRaw)) {
    skills[category] = strArray(skillsRaw[category], `profile.skills["${category}"]`);
  }

  return {
    personal,
    education,
    experience,
    achievements,
    financeAreas,
    technologyXFinanceAreas: strArray(
      raw.technologyXFinanceAreas,
      "profile.technologyXFinanceAreas",
    ),
    skills,
    additionalVerifiedSkills: strArray(
      raw.additionalVerifiedSkills,
      "profile.additionalVerifiedSkills",
    ),
  };
}
