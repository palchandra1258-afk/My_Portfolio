"use client";

// Media management controls — Phase 8.
//
// Client Components for two reasons, both genuine local state: previewing a
// chosen file before it is saved, and the two-step delete confirmation.
// Neither holds a session nor decides anything about authorization — every
// form posts to a server action that re-establishes the caller's identity from
// the cookie. A hidden or disabled button would protect nothing and is not
// relied upon.
//
// ── Accessibility (SECURITY_AND_QUALITY.md §11, §97) ──────────────────────
//   - every control has a real <label htmlFor>, never a placeholder standing
//     in for one
//   - a field in error carries aria-invalid and is described by its message
//     through aria-describedby, so the message is announced with the field
//     rather than sitting silently beside it
//   - errors are role="alert"; confirmations and the delete prompt sit in
//     aria-live regions, so a keyboard or screen-reader user learns the
//     outcome without hunting for it
//   - the delete confirmation is inline, not window.confirm(), which is
//     unstyled and unreachable by assistive tech in some browsers
//   - focus-visible outlines everywhere, matching the rest of the admin
//
// ── Why the preview is revoked ────────────────────────────────────────────
// URL.createObjectURL pins the file in memory until revoked. Choosing a dozen
// images without revoking would hold every one of them.

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import type { MediaFormState } from "@/app/admin/(dashboard)/media/actions";

const EMPTY_STATE: MediaFormState = { errors: {}, message: null, success: null };

type Action = (state: MediaFormState, form: FormData) => Promise<MediaFormState>;

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function SubmitButton({ label, busyLabel }: { label: string; busyLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
    >
      {pending ? busyLabel : label}
    </button>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (message === undefined) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-red-400">
      {message}
    </p>
  );
}

function FormMessage({ state }: { state: MediaFormState }) {
  if (state.message === null) return null;
  return (
    <p role="alert" className="mt-3 text-sm text-red-400">
      {state.message}
    </p>
  );
}

function TextField({
  name,
  label,
  hint,
  defaultValue,
  error,
  required,
  multiline,
  maxLength,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue: string;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  maxLength: number;
}) {
  const id = `media-${name}`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy =
    [hint !== undefined ? hintId : null, error !== undefined ? errorId : null]
      .filter((value): value is string => value !== null)
      .join(" ") || undefined;

  const shared = {
    id,
    name,
    defaultValue,
    maxLength,
    required,
    "aria-invalid": error !== undefined,
    "aria-describedby": describedBy,
    className:
      "mt-1 w-full rounded border border-border bg-card px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[invalid=true]:border-red-400",
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required === true && (
          <span aria-hidden="true" className="ml-1 text-accent">
            *
          </span>
        )}
        {required === true && <span className="sr-only"> (required)</span>}
      </label>
      {hint !== undefined && (
        <p id={hintId} className="mt-0.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {multiline === true ? (
        <textarea {...shared} rows={3} />
      ) : (
        <input {...shared} type="text" />
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

/**
 * Two-step delete.
 *
 * Its own <form> so it posts independently of the upload form beside it — a
 * nested form is invalid HTML and browsers resolve it unpredictably.
 */
function DeleteControl({
  action,
  label,
  question,
}: {
  action: Action;
  label: string;
  question: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState(action, EMPTY_STATE);

  return (
    <div aria-live="polite">
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-sm text-muted underline-offset-4 transition-colors hover:text-red-400 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {label}
        </button>
      ) : (
        <form action={formAction} className="rounded border border-red-400/40 bg-red-400/5 p-4">
          <p className="text-sm">{question}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <SubmitButton label="Delete" busyLabel="Deleting…" />
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-sm text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Cancel
            </button>
          </div>
          <FormMessage state={state} />
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile photo
// ---------------------------------------------------------------------------

export interface PhotoState {
  url: string;
  altText: string;
  caption: string;
  filename: string;
  size: string;
  dimensions: string;
  updatedAt: string;
  updatedBy: string | null;
}

export function PhotoManager({
  photo,
  uploadAction,
  updateAction,
  deleteAction,
}: {
  photo: PhotoState | null;
  uploadAction: Action;
  updateAction: Action;
  deleteAction: Action;
}) {
  const [uploadState, uploadFormAction] = useActionState(uploadAction, EMPTY_STATE);
  const [metaState, metaFormAction] = useActionState(updateAction, EMPTY_STATE);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  // Release the previous object URL whenever it is replaced, and on unmount.
  useEffect(() => {
    return () => {
      if (previewRef.current !== null) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (previewRef.current !== null) URL.revokeObjectURL(previewRef.current);

    if (file === undefined) {
      previewRef.current = null;
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreview(url);
  }

  return (
    <div className="space-y-6">
      {/* Current state, or the fallback. */}
      <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
        <div>
          <div className="relative aspect-[4/5] overflow-hidden rounded border border-border bg-card">
            {photo !== null ? (
              // Not next/image: this is an admin-only preview of a
              // database-served blob, and routing it through the optimizer
              // would add a second hop for no benefit at this size.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.url} alt={photo.altText} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
                <span className="font-display text-4xl text-muted">C</span>
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted">
                  No photo
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="text-sm">
          {photo !== null ? (
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              <Meta label="Filename" value={photo.filename} />
              <Meta label="Size" value={photo.size} />
              <Meta label="Dimensions" value={photo.dimensions} />
              <Meta label="Updated" value={photo.updatedAt} />
              {photo.updatedBy !== null && <Meta label="Updated by" value={photo.updatedBy} />}
            </dl>
          ) : (
            <p className="text-muted">
              No photo is stored. The site shows a lettered placeholder in its place, which is a
              designed state rather than a broken one.
            </p>
          )}
        </div>
      </div>

      {/* Upload / replace */}
      <form action={uploadFormAction} className="space-y-4 rounded border border-border p-4">
        <h3 className="font-display text-sm">{photo === null ? "Upload a photo" : "Replace the photo"}</h3>

        <div>
          <label htmlFor="photo-file" className="block text-sm font-medium">
            Image file
            <span aria-hidden="true" className="ml-1 text-accent">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </label>
          <p id="photo-file-hint" className="mt-0.5 text-xs text-muted">
            JPEG, PNG or WebP. At least 200×200, at most 5 MB. SVG is not accepted.
          </p>
          <input
            id="photo-file"
            name="file"
            type="file"
            required
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={onFileChange}
            aria-describedby={
              uploadState.errors.file !== undefined ? "photo-file-hint photo-file-error" : "photo-file-hint"
            }
            aria-invalid={uploadState.errors.file !== undefined}
            className="mt-2 block w-full text-sm file:mr-3 file:rounded-full file:border file:border-border file:bg-card file:px-4 file:py-1.5 file:text-sm file:text-foreground hover:file:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <FieldError id="photo-file-error" message={uploadState.errors.file} />
        </div>

        {/* Preview before saving — announced, because it appears without a
            page change. */}
        <div aria-live="polite">
          {preview !== null && (
            <div>
              <p className="text-xs text-muted">Preview — not saved yet</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Preview of the image you selected"
                className="mt-2 h-40 w-32 rounded border border-accent/40 object-cover"
              />
            </div>
          )}
        </div>

        <TextField
          name="altText"
          label="Alt text"
          hint="Describe what the photo shows. Screen readers announce this instead of the image."
          defaultValue={photo?.altText ?? ""}
          error={uploadState.errors.altText}
          required
          maxLength={300}
        />
        <TextField
          name="caption"
          label="Caption"
          hint="Optional."
          defaultValue={photo?.caption ?? ""}
          error={uploadState.errors.caption}
          multiline
          maxLength={500}
        />

        <SubmitButton
          label={photo === null ? "Upload photo" : "Replace photo"}
          busyLabel="Uploading…"
        />
        <FormMessage state={uploadState} />
        {photo !== null && (
          <p className="text-xs text-muted">
            The current photo stays in place until the new one is stored successfully.
          </p>
        )}
      </form>

      {/* Text-only edit, so fixing alt text never risks the image. */}
      {photo !== null && (
        <form action={metaFormAction} className="space-y-4 rounded border border-border p-4">
          <h3 className="font-display text-sm">Edit text only</h3>
          <p className="text-xs text-muted">Changes the description without touching the image.</p>
          <TextField
            name="altText"
            label="Alt text"
            defaultValue={photo.altText}
            error={metaState.errors.altText}
            required
            maxLength={300}
          />
          <TextField
            name="caption"
            label="Caption"
            defaultValue={photo.caption}
            error={metaState.errors.caption}
            multiline
            maxLength={500}
          />
          <SubmitButton label="Save text" busyLabel="Saving…" />
          <FormMessage state={metaState} />
        </form>
      )}

      {photo !== null && (
        <DeleteControl
          action={deleteAction}
          label="Delete this photo"
          question="Delete the profile photo? The site will show the lettered placeholder until a new one is uploaded."
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resume
// ---------------------------------------------------------------------------

export interface ResumeState {
  url: string;
  downloadUrl: string;
  title: string;
  description: string;
  downloadLabel: string;
  filename: string;
  mimeType: string;
  size: string;
  updatedAt: string;
  updatedBy: string | null;
}

export function ResumeManager({
  resume,
  uploadAction,
  updateAction,
  deleteAction,
}: {
  resume: ResumeState | null;
  uploadAction: Action;
  updateAction: Action;
  deleteAction: Action;
}) {
  const [uploadState, uploadFormAction] = useActionState(uploadAction, EMPTY_STATE);
  const [metaState, metaFormAction] = useActionState(updateAction, EMPTY_STATE);
  const [chosen, setChosen] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="text-sm">
        {resume !== null ? (
          <>
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              <Meta label="Filename" value={resume.filename} />
              <Meta label="Type" value={resume.mimeType} />
              <Meta label="Size" value={resume.size} />
              <Meta label="Updated" value={resume.updatedAt} />
              {resume.updatedBy !== null && <Meta label="Updated by" value={resume.updatedBy} />}
            </dl>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={resume.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-foreground/20 px-4 py-2 text-sm transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Preview in a new tab
              </a>
              <a
                href={resume.downloadUrl}
                download={resume.filename}
                className="rounded-full border border-foreground/20 px-4 py-2 text-sm transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Download
              </a>
            </div>
          </>
        ) : (
          <p className="text-muted">
            No resume is stored. Public pages hide the download link rather than offering one that
            leads nowhere.
          </p>
        )}
      </div>

      <form action={uploadFormAction} className="space-y-4 rounded border border-border p-4">
        <h3 className="font-display text-sm">
          {resume === null ? "Upload a resume" : "Replace the resume"}
        </h3>

        <div>
          <label htmlFor="resume-file" className="block text-sm font-medium">
            PDF file
            <span aria-hidden="true" className="ml-1 text-accent">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </label>
          <p id="resume-file-hint" className="mt-0.5 text-xs text-muted">
            PDF only, at most 10 MB. The download link does not change when you replace the file.
          </p>
          <input
            id="resume-file"
            name="file"
            type="file"
            required
            accept=".pdf,application/pdf"
            onChange={(event) => setChosen(event.target.files?.[0]?.name ?? null)}
            aria-describedby={
              uploadState.errors.file !== undefined
                ? "resume-file-hint resume-file-error"
                : "resume-file-hint"
            }
            aria-invalid={uploadState.errors.file !== undefined}
            className="mt-2 block w-full text-sm file:mr-3 file:rounded-full file:border file:border-border file:bg-card file:px-4 file:py-1.5 file:text-sm file:text-foreground hover:file:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <FieldError id="resume-file-error" message={uploadState.errors.file} />
        </div>

        <div aria-live="polite">
          {chosen !== null && (
            <p className="text-xs text-muted">
              Selected: <span className="font-mono">{chosen}</span> — not saved yet
            </p>
          )}
        </div>

        <TextField
          name="title"
          label="Display title"
          hint="Optional heading shown beside the download."
          defaultValue={resume?.title ?? ""}
          error={uploadState.errors.title}
          maxLength={120}
        />
        <TextField
          name="description"
          label="Description"
          hint="Optional."
          defaultValue={resume?.description ?? ""}
          error={uploadState.errors.description}
          multiline
          maxLength={500}
        />
        <TextField
          name="downloadLabel"
          label="Download label"
          hint='Optional button text. Defaults to "Resume".'
          defaultValue={resume?.downloadLabel ?? ""}
          error={uploadState.errors.downloadLabel}
          maxLength={40}
        />

        <SubmitButton
          label={resume === null ? "Upload resume" : "Replace resume"}
          busyLabel="Uploading…"
        />
        <FormMessage state={uploadState} />
        {resume !== null && (
          <p className="text-xs text-muted">
            The current resume stays downloadable until the new one is stored successfully.
          </p>
        )}
      </form>

      {resume !== null && (
        <form action={metaFormAction} className="space-y-4 rounded border border-border p-4">
          <h3 className="font-display text-sm">Edit text only</h3>
          <p className="text-xs text-muted">Changes the wording without replacing the file.</p>
          <TextField
            name="title"
            label="Display title"
            defaultValue={resume.title}
            error={metaState.errors.title}
            maxLength={120}
          />
          <TextField
            name="description"
            label="Description"
            defaultValue={resume.description}
            error={metaState.errors.description}
            multiline
            maxLength={500}
          />
          <TextField
            name="downloadLabel"
            label="Download label"
            defaultValue={resume.downloadLabel}
            error={metaState.errors.downloadLabel}
            maxLength={40}
          />
          <SubmitButton label="Save text" busyLabel="Saving…" />
          <FormMessage state={metaState} />
        </form>
      )}

      {resume !== null && (
        <DeleteControl
          action={deleteAction}
          label="Delete this resume"
          question="Delete the resume? Public pages will stop offering the download until a new one is uploaded."
        />
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{value}</dd>
    </div>
  );
}
