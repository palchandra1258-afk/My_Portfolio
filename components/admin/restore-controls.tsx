"use client";

// Restore control — CMS_SPECIFICATION.md §49, ADMIN_DASHBOARD_SPECIFICATION.md §59.
//
// A Client Component for one reason: the confirmation step needs local state.
// It holds no session and decides nothing about authorization. The button
// being hidden, disabled or absent would protect nothing, and is not relied
// upon — the server action re-establishes the caller's identity from the
// cookie before it reads a single field.
//
// The confirmation is not ceremony. Restore overwrites the project's current
// content, and the person clicking it is often looking at an old revision
// rather than at what they are about to replace — so the question spells out
// both halves: what gets overwritten, and what does not change.

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import type { ProjectFormState } from "@/app/admin/(dashboard)/projects/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
    >
      {pending ? "Restoring…" : "Restore this revision"}
    </button>
  );
}

export function RestoreControls({
  slug,
  revisionId,
  versionNumber,
  publicationStatus,
  restoreAction,
}: {
  slug: string;
  revisionId: number;
  versionNumber: number;
  /** The project's status *now* — not the status recorded in this revision. */
  publicationStatus: string;
  restoreAction: (state: ProjectFormState, form: FormData) => Promise<ProjectFormState>;
}) {
  const [confirming, setConfirming] = useState(false);

  // `useActionState` rather than a bare function: the action's return value is
  // how a refusal — a revision whose vocabulary is no longer valid, a slug
  // another project has taken — reaches the screen instead of being swallowed.
  // On success the action redirects and this state is never read.
  const [state, formAction] = useActionState(restoreAction, {
    errors: {},
    message: null,
  } as ProjectFormState);

  const isPublished = publicationStatus === "published";
  const fieldErrors = Object.entries(state.errors);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-base">Restore</h2>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted">
            Copy this revision&rsquo;s content back onto the project. Nothing in the history is
            removed — the restore is recorded as a new revision of its own.
          </p>
        </div>

        {!confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="shrink-0 rounded-full border border-foreground/20 px-4 py-2 text-sm transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Restore&hellip;
          </button>
        )}
      </div>

      {/* Announced rather than silently appearing below the fold. */}
      <div aria-live="polite">
        {confirming && (
          <form action={formAction} className="mt-4 rounded border border-accent/40 bg-accent/5 p-4">
            {/* Identifiers, not credentials. The action checks the session
                first, and requires these two to match in the database. */}
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="revisionId" value={revisionId} />

            <p className="text-sm leading-relaxed">
              Replace the project&rsquo;s current content with version {versionNumber}?
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              <li>
                The current content is overwritten — but it is already recorded in the history and
                can be restored back.
              </li>
              <li>
                {isPublished
                  ? "This project stays published, and the restored content goes live immediately."
                  : "This project stays a draft. Restoring does not publish it."}
              </li>
              <li>
                Metrics, results, implementation notes, alternate names and relationships are not
                changed by this editor, so they are left as they are.
              </li>
            </ul>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <SubmitButton />
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-sm text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Cancel
              </button>
            </div>

            {state.message !== null && (
              <p role="alert" className="mt-3 text-sm text-red-400">
                {state.message}
              </p>
            )}
            {fieldErrors.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-red-400">
                {fieldErrors.map(([field, message]) => (
                  <li key={field}>
                    <span className="font-mono text-xs">{field}</span>: {message}
                  </li>
                ))}
              </ul>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
