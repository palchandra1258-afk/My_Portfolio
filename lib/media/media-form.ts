// Media metadata parsing and validation — Phase 8.
//
// The text that travels beside an asset: alt text and caption for the
// portrait, title/description/download label for the resume. Same division of
// labour as lib/admin/project-form.ts — pure, server-side, FormData in and a
// result out, so every branch is testable without a database or a browser.
//
// SECURITY_AND_QUALITY.md §28 and CMS_SPECIFICATION.md §56: the browser's
// `required` and `maxlength` are a convenience; these rules are the boundary.
// An attacker posts straight at the server action and never sees the form.

export interface PhotoMetadataValues {
  /** CMS_SPECIFICATION.md §36. Required — see below. */
  altText: string;
  /** Optional. Empty string means "no caption", which is a legitimate state. */
  caption: string;
}

export interface ResumeMetadataValues {
  title: string;
  description: string;
  downloadLabel: string;
}

export type MediaFieldErrors = Record<string, string>;

export type MediaFormResult<T> = { ok: true; values: T } | { ok: false; errors: MediaFieldErrors };

const LIMITS = {
  altText: 300,
  caption: 500,
  title: 120,
  description: 500,
  downloadLabel: 40,
} as const;

function readString(form: FormData, field: string): string {
  const raw = form.get(field);
  // FormData values can be File objects; anything that is not a string is
  // treated as absent rather than coerced to "[object File]".
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * Validate the portrait's text.
 *
 * ── Why alt text is required ──────────────────────────────────────────────
 * §36 says alt text should describe meaningful content and must not be derived
 * from the filename. A portrait on the home page is meaningful content, not
 * decoration, so the empty-alt strategy §36 allows for decorative images does
 * not apply — an empty alt here would leave a screen-reader user with nothing.
 * Refusing the save is better than storing a blank and better still than
 * inventing a description from the filename, which §36 explicitly forbids.
 */
export function parsePhotoMetadata(form: FormData): MediaFormResult<PhotoMetadataValues> {
  const errors: MediaFieldErrors = {};

  const altText = readString(form, "altText");
  if (altText.length === 0) {
    errors.altText = "Alt text is required — describe what the photo shows.";
  } else if (altText.length > LIMITS.altText) {
    errors.altText = `Alt text may be at most ${LIMITS.altText} characters.`;
  }

  const caption = readString(form, "caption");
  if (caption.length > LIMITS.caption) {
    errors.caption = `A caption may be at most ${LIMITS.caption} characters.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, values: { altText, caption } };
}

/**
 * Validate the resume's text.
 *
 * All three are optional: the resume is usable with no heading and a default
 * button label, and a blank submission is a legitimate edit meaning "clear
 * it". The presentation layer supplies its own defaults rather than storing
 * invented ones — nothing here fabricates a title from a filename.
 */
export function parseResumeMetadata(form: FormData): MediaFormResult<ResumeMetadataValues> {
  const errors: MediaFieldErrors = {};

  const title = readString(form, "title");
  if (title.length > LIMITS.title) {
    errors.title = `A title may be at most ${LIMITS.title} characters.`;
  }

  const description = readString(form, "description");
  if (description.length > LIMITS.description) {
    errors.description = `A description may be at most ${LIMITS.description} characters.`;
  }

  const downloadLabel = readString(form, "downloadLabel");
  if (downloadLabel.length > LIMITS.downloadLabel) {
    errors.downloadLabel = `A download label may be at most ${LIMITS.downloadLabel} characters.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, values: { title, description, downloadLabel } };
}

/** Human-readable size for the admin screen. */
export function formatBytes(count: number): string {
  if (count >= 1024 * 1024) return `${(count / (1024 * 1024)).toFixed(1)} MB`;
  if (count >= 1024) return `${Math.round(count / 1024)} KB`;
  return `${count} bytes`;
}

/** The label a download button should carry, when none was configured. */
export const DEFAULT_DOWNLOAD_LABEL = "Resume";
