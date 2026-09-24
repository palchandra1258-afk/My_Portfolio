// Turning a stored revision snapshot back into a validated edit — Phase 10.
//
// CMS_SPECIFICATION.md §49 and ADMIN_DASHBOARD_SPECIFICATION.md §59 both list
// "validate the restored content" as a requirement of restore, not as an
// optional extra. This module is where that happens.
//
// ── Why a snapshot is untrusted input ─────────────────────────────────────
// A snapshot is JSON that was written by a *past* version of this application.
// It is not a `ProjectSnapshot` because the type says so — it is whatever
// shape the code had when it was stored, read back through a cast. A column
// that has since become required, a vocabulary that has since lost a member,
// or a hand-edited row would all arrive here looking structurally fine and
// then be written straight into the live project. Restore is therefore held to
// exactly the same validation as a human submitting the form.
//
// ── Why it validates by *building a form* ─────────────────────────────────
// `parseProjectForm` is already the server-side validation boundary for
// project content: it bounds every length, restricts every vocabulary, and
// rejects a `javascript:` URL. Re-implementing those rules for restore would
// create a second boundary that could drift from the first — and the drift
// would be silent, because restore is the rarer path. Converting the snapshot
// into FormData and handing it to the same parser means restore can never
// accept content the editor would refuse.
//
// ── Publication status is deliberately NOT taken from the snapshot ────────
// See `restoreFormData`.

import { parseProjectForm, type ProjectFormResult } from "@/lib/admin/project-form";
import type { PublicationStatusValue } from "@/lib/admin/project-form";
import type { ProjectSnapshot } from "@/lib/repositories/revision-repository.server";

/** Read a field that *should* be a string, without trusting that it is. */
function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Read a field that *should* be an array of strings.
 *
 * Non-string members are dropped rather than coerced: "[object Object]" is not
 * a technology, and inventing one would violate the project's content rules
 * just as surely as typing it in by hand.
 */
function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/**
 * Rebuild the editor's form submission from a snapshot.
 *
 * `currentPublicationStatus` is the project's status *right now*, not the
 * status recorded in the snapshot, and substituting it is the single most
 * important decision in this file.
 *
 * ADMIN_DASHBOARD_SPECIFICATION.md §59 requires restore to "require publishing
 * if public content should change". Writing the snapshot's own status would
 * break that in both directions:
 *
 *   - restoring a revision taken while the project was published would push
 *     old content live in one click, with no publish step and no confirmation;
 *   - restoring a revision taken while it was a draft would silently pull a
 *     live project off the public site.
 *
 * Neither is a content restore. Restore changes what the project *says*;
 * whether the world can see it stays exactly as the administrator last left
 * it, and changing that remains the publish control's job. `published_at`
 * follows automatically, because the repository only moves it when the status
 * moves.
 */
export function restoreFormData(
  snapshot: ProjectSnapshot,
  currentPublicationStatus: PublicationStatusValue,
): FormData {
  const project: Record<string, unknown> =
    typeof snapshot?.project === "object" && snapshot.project !== null
      ? (snapshot.project as unknown as Record<string, unknown>)
      : {};

  const form = new FormData();
  form.set("slug", str(project.slug));
  form.set("title", str(project.title));
  form.set("category", str(project.category));
  form.set("status", str(project.status));
  form.set("source", str(project.source));
  form.set("shortDescription", str(project.shortDescription));
  form.set("evidenceStatus", str(project.evidenceStatus));
  form.set("verificationNotes", str(project.verificationNotes));
  form.set("technologies", strings(project.technologies).join("\n"));
  form.set("githubUrl", str(project.githubUrl));
  form.set("demoUrl", str(project.demoUrl));
  form.set("displayOrder", String(snapshot?.displayOrder ?? 0));
  form.set("publicationStatus", currentPublicationStatus);

  // A checkbox is absent when unchecked, and `parseProjectForm` reads it as
  // `form.get("featured") !== null`. Setting it to the string "false" would
  // therefore restore a non-featured project as featured.
  if (project.featured === true) form.set("featured", "on");

  return form;
}

/**
 * Validate a snapshot as if it had just been typed into the editor.
 *
 * Returns the same discriminated result `parseProjectForm` returns, so a
 * caller handles a bad snapshot exactly as it handles a bad form — there is no
 * separate "restore failed" shape to get wrong.
 */
export function parseSnapshotForRestore(
  snapshot: ProjectSnapshot,
  currentPublicationStatus: PublicationStatusValue,
): ProjectFormResult {
  return parseProjectForm(restoreFormData(snapshot, currentPublicationStatus));
}
