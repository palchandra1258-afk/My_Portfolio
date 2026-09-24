"use client";

// Publish / unpublish control — CMS_SPECIFICATION.md §45, §46;
// ADMIN_DASHBOARD_SPECIFICATION.md §52, §53.
//
// A Client Component for one reason: the confirmation step needs local state.
// It holds no session and decides nothing about authorization — it posts to a
// server action which re-establishes the caller's identity from the cookie. The
// button being hidden, disabled or absent would not protect anything, and is
// not relied upon.
//
// ── Why an inline confirm rather than window.confirm ───────────────────────
// `confirm()` is unstyled, unfocusable by assistive tech in some browsers, and
// blocks the main thread. The two-step inline control is keyboard-reachable,
// announces itself through a live region, and — importantly — leaves the real
// submit button as a plain <button type="submit"> inside a <form>, so the
// action still works exactly as a form post.
//
// Publishing is confirmed too, not just unpublishing: publishing is the step
// that makes content visible to the world, which is the harder one to undo in
// the sense that matters.

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import type { ProjectFormState } from "@/app/admin/(dashboard)/projects/actions";

function SubmitButton({ label, tone }: { label: string; tone: "publish" | "unpublish" }) {
  const { pending } = useFormStatus();
  const className =
    tone === "publish"
      ? "rounded-full bg-emerald-500/90 px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
      : "rounded-full border border-foreground/30 px-4 py-2 text-sm transition-colors hover:border-accent hover:text-accent disabled:opacity-60";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
    >
      {pending ? "Working…" : label}
    </button>
  );
}

export function PublishControls({
  slug,
  publicationStatus,
  publishAction,
  unpublishAction,
}: {
  slug: string;
  publicationStatus: string;
  publishAction: (state: ProjectFormState, form: FormData) => Promise<ProjectFormState>;
  unpublishAction: (state: ProjectFormState, form: FormData) => Promise<ProjectFormState>;
}) {
  const [confirming, setConfirming] = useState(false);
  const isPublished = publicationStatus === "published";

  // `useActionState` rather than a bare function: these actions have the
  // (previousState, formData) signature, and their return value is how a
  // failure — a project deleted in another session, say — reaches the screen
  // instead of being swallowed. On success the action redirects and this state
  // is never read.
  const [state, formAction] = useActionState(
    isPublished ? unpublishAction : publishAction,
    { errors: {}, message: null } as ProjectFormState,
  );
  const verb = isPublished ? "Unpublish" : "Publish";
  const question = isPublished
    ? "Remove this project from the public site? It keeps all of its content and can be published again."
    : "Make this project visible to everyone on the public site?";

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-base">Publication</h2>
          <p className="mt-1 text-sm text-muted">
            {isPublished
              ? "Published — visible on the public site."
              : "Not published — visitors cannot see this project."}
          </p>
        </div>

        {!confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-full border border-foreground/20 px-4 py-2 text-sm transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {verb}…
          </button>
        )}
      </div>

      {/* Announced rather than silently appearing below the fold. */}
      <div aria-live="polite">
        {confirming && (
          <form
            // The action receives the slug as data. It is not what authorizes
            // the call; the session is, and the action checks it first.
            action={formAction}
            className="mt-4 rounded border border-accent/40 bg-accent/5 p-4"
          >
            <input type="hidden" name="slug" value={slug} />
            <p className="text-sm">{question}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <SubmitButton label={verb} tone={isPublished ? "unpublish" : "publish"} />
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
          </form>
        )}
      </div>
    </div>
  );
}
