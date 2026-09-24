// Project form parsing and validation — Phase 7 (Project CMS).
//
// SECURITY_AND_QUALITY.md §28 and CMS_SPECIFICATION.md §56: client-side
// validation is a convenience, server-side validation is the security
// boundary. Everything here runs on the server, on the raw FormData, before
// any value reaches Prisma. The browser's `required` and `pattern` attributes
// are duplicated here on purpose — an attacker posts straight to the server
// action and never sees the form.
//
// Pure by construction: FormData in, a result out. No database, no session, no
// Next.js. That is what lets every branch — including the ones a browser makes
// hard to reach — be tested in the default `npm test` suite.
//
// ── What this deliberately does NOT do ─────────────────────────────────────
// It does not check slug uniqueness. That is not knowable from the form alone
// and cannot be made race-free in application code; the database's UNIQUE
// index is the real guarantee, and the repository turns its violation into a
// field error. Checking here as well would invite treating this as sufficient.
//
// It does not touch the narrative or evidence fields the editor does not show
// (problem, approach, architecture, metrics, results, implementation notes,
// relationships). Those keep whatever they already hold — see
// admin-project-repository.server.ts.

import type {
  ProjectCategory,
  ProjectStatus,
  VerificationStatus,
} from "@/lib/types";

/** Publication states the editor can set (CMS_SPECIFICATION.md §43, §45, §46). */
export const PUBLICATION_STATUSES = ["draft", "published", "archived"] as const;
export type PublicationStatusValue = (typeof PUBLICATION_STATUSES)[number];

/** Provenance of the project's facts — schema column `source`, NOT NULL. */
export const PROJECT_SOURCES = ["Resume", "GitHub", "Both"] as const;
export type ProjectSourceValue = (typeof PROJECT_SOURCES)[number];

export const PROJECT_CATEGORIES: readonly ProjectCategory[] = [
  "featured",
  "supporting",
  "research",
  "coming-soon",
];

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  "Completed",
  "Active Development",
  "Internship Project",
  "Research / Experimental",
  "Repository Placeholder",
  "Unpublished",
];

export const EVIDENCE_STATUSES: readonly VerificationStatus[] = [
  "verified",
  "partially-verified",
  "self-reported",
  "unpublished",
  "needs-information",
  // `in-development` and `planned` exist in the vocabulary but lib/types.ts
  // marks them retained-for-compatibility and tells new projects not to use
  // them. The editor therefore does not offer them; an existing project
  // carrying one keeps it, because evidenceStatus is only written when the
  // form supplies a value from this list.
];

/** The fields this editor owns. Every other column is left untouched. */
export interface ProjectFormValues {
  slug: string;
  title: string;
  category: ProjectCategory;
  status: ProjectStatus;
  source: ProjectSourceValue;
  featured: boolean;
  shortDescription: string;
  evidenceStatus: VerificationStatus;
  /** Internal, admin-only. Empty string means "cleared", and is allowed. */
  verificationNotes: string;
  technologies: string[];
  githubUrl: string | null;
  demoUrl: string | null;
  displayOrder: number;
  publicationStatus: PublicationStatusValue;
}

export type ProjectFieldErrors = Partial<Record<keyof ProjectFormValues, string>>;

export type ProjectFormResult =
  | { ok: true; values: ProjectFormValues }
  | { ok: false; errors: ProjectFieldErrors };

// Length ceilings. Generous relative to the real content — the longest
// verificationNotes in content/projects.ts is a few hundred characters — but
// bounded, so a multi-megabyte POST is rejected before it reaches the database
// (SECURITY_AND_QUALITY.md §28: bound every input).
const LIMITS = {
  slug: 100,
  title: 200,
  shortDescription: 1000,
  verificationNotes: 5000,
  technology: 80,
  technologies: 60,
  url: 500,
} as const;

/**
 * URL-safe slug: lowercase alphanumeric words joined by single hyphens.
 *
 * Matches the shape of every existing slug, and rules out the characters that
 * would make a project URL ambiguous or need escaping. No leading, trailing or
 * doubled hyphens.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readString(form: FormData, field: string): string {
  const raw = form.get(field);
  // FormData values can be File objects; anything that is not a string is
  // treated as absent rather than coerced to "[object File]".
  return typeof raw === "string" ? raw.trim() : "";
}

function oneOf<T extends string>(value: string, allowed: readonly T[]): T | null {
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/**
 * Parse the technologies textarea.
 *
 * Accepts one per line or comma-separated, because both are natural to type.
 * Duplicates are removed case-insensitively while keeping the first spelling —
 * the `technologies.name` unique index is case-sensitive (DATABASE_DESIGN.md
 * §26, Open Decision 9), so "React" and "react" would otherwise become two
 * rows describing one technology.
 */
export function parseTechnologies(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\n,]/)) {
    const name = part.trim();
    if (name.length === 0) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** An http(s) URL, or null when the field is blank. Throws nothing; returns a flag. */
function parseOptionalUrl(raw: string): { ok: true; value: string | null } | { ok: false } {
  if (raw.length === 0) return { ok: true, value: null };
  if (raw.length > LIMITS.url) return { ok: false };
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false };
  }
  // Only http(s). `javascript:` and `data:` URLs are rejected outright — these
  // values are rendered as link hrefs on the public site.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return { ok: false };
  return { ok: true, value: parsed.toString() };
}

/**
 * Validate a submitted project form.
 *
 * Collects every field error rather than stopping at the first, so one
 * round-trip shows the operator everything that needs fixing
 * (ADMIN_DASHBOARD_SPECIFICATION.md §71).
 */
export function parseProjectForm(form: FormData): ProjectFormResult {
  const errors: ProjectFieldErrors = {};

  const slug = readString(form, "slug").toLowerCase();
  if (slug.length === 0) {
    errors.slug = "A slug is required.";
  } else if (slug.length > LIMITS.slug) {
    errors.slug = `A slug may be at most ${LIMITS.slug} characters.`;
  } else if (!SLUG_PATTERN.test(slug)) {
    errors.slug =
      "Use lowercase letters, numbers and single hyphens only — for example `image-captioning`.";
  }

  const title = readString(form, "title");
  if (title.length === 0) errors.title = "A title is required.";
  else if (title.length > LIMITS.title) {
    errors.title = `A title may be at most ${LIMITS.title} characters.`;
  }

  const shortDescription = readString(form, "shortDescription");
  if (shortDescription.length === 0) {
    // Required, and never silently replaced with a placeholder: an empty
    // summary on a live project page is worse than refusing the save.
    errors.shortDescription = "A short description is required.";
  } else if (shortDescription.length > LIMITS.shortDescription) {
    errors.shortDescription = `At most ${LIMITS.shortDescription} characters.`;
  }

  // Internal, admin-only, and optional.
  //
  // It was required while it rendered on the public project page: blanking it
  // there removed a visitor's only signal about what had actually been
  // checked. Now that it is internal working material the author owns, an
  // empty value is a legitimate edit — "there is nothing to note" — and the
  // editor must be able to express it. An empty submission clears the column
  // to "" rather than being rejected.
  const verificationNotes = readString(form, "verificationNotes");
  if (verificationNotes.length > LIMITS.verificationNotes) {
    errors.verificationNotes = `At most ${LIMITS.verificationNotes} characters.`;
  }

  const category = oneOf(readString(form, "category"), PROJECT_CATEGORIES);
  if (category === null) errors.category = "Choose a category.";

  const status = oneOf(readString(form, "status"), PROJECT_STATUSES);
  if (status === null) errors.status = "Choose a status.";

  const source = oneOf(readString(form, "source"), PROJECT_SOURCES);
  if (source === null) errors.source = "Choose where this project's facts come from.";

  const evidenceStatus = oneOf(readString(form, "evidenceStatus"), EVIDENCE_STATUSES);
  if (evidenceStatus === null) errors.evidenceStatus = "Choose an evidence status.";

  const publicationStatus = oneOf(readString(form, "publicationStatus"), PUBLICATION_STATUSES);
  if (publicationStatus === null) errors.publicationStatus = "Choose a publication status.";

  const technologies = parseTechnologies(readString(form, "technologies"));
  if (technologies.length > LIMITS.technologies) {
    errors.technologies = `At most ${LIMITS.technologies} technologies.`;
  } else if (technologies.some((t) => t.length > LIMITS.technology)) {
    errors.technologies = `Each technology may be at most ${LIMITS.technology} characters.`;
  }

  const github = parseOptionalUrl(readString(form, "githubUrl"));
  if (!github.ok) errors.githubUrl = "Enter a full http(s) URL, or leave it blank.";

  const demo = parseOptionalUrl(readString(form, "demoUrl"));
  if (!demo.ok) errors.demoUrl = "Enter a full http(s) URL, or leave it blank.";

  const displayOrderRaw = readString(form, "displayOrder");
  const displayOrder = Number(displayOrderRaw);
  if (
    displayOrderRaw.length === 0 ||
    !Number.isInteger(displayOrder) ||
    displayOrder < 0 ||
    displayOrder > 9999
  ) {
    errors.displayOrder = "Enter a whole number of 0 or more.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    values: {
      slug,
      title,
      // Non-null assertions are safe here: each of these was checked above and
      // an error would have short-circuited the return.
      category: category!,
      status: status!,
      source: source!,
      featured: form.get("featured") !== null,
      shortDescription,
      evidenceStatus: evidenceStatus!,
      verificationNotes,
      technologies,
      githubUrl: github.ok ? github.value : null,
      demoUrl: demo.ok ? demo.value : null,
      displayOrder,
      publicationStatus: publicationStatus!,
    },
  };
}
