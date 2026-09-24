"use client";

// Project create/edit form — Phase 7.
//
// A Client Component because it needs `useActionState` for server-returned
// field errors and `useFormStatus` for the pending state. It holds no
// session, makes no authorization decision, and performs no write: it posts
// to a server action which re-validates everything it sends
// (ADMIN_DASHBOARD_SPECIFICATION.md §71 — client validation is UX, server
// validation is the boundary).
//
// The browser-side `required`, `pattern` and `type="url"` attributes are here
// to catch mistakes early. They are not trusted; lib/admin/project-form.ts
// re-checks every one of them.
//
// Accessibility (§70, §97): every control has a real <label>, related controls
// are grouped in <fieldset>/<legend>, a field in error carries aria-invalid
// and points at its message with aria-describedby, and the summary at the top
// is a live region so a failed save is announced rather than silently
// scrolling off. Nothing depends on colour alone.

import Link from "next/link";
import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";

import {
  EVIDENCE_STATUSES,
  PROJECT_CATEGORIES,
  PROJECT_SOURCES,
  PROJECT_STATUSES,
  PUBLICATION_STATUSES,
  type ProjectFieldErrors,
  type ProjectFormValues,
} from "@/lib/admin/project-form";
import type { ProjectFormState } from "@/app/admin/(dashboard)/projects/actions";

const EMPTY: ProjectFormState = { errors: {}, message: null };

const INPUT_CLASS =
  "mt-1.5 w-full rounded border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function Field({
  name,
  label,
  hint,
  errors,
  children,
}: {
  name: keyof ProjectFormValues;
  label: string;
  hint?: string;
  errors: ProjectFieldErrors;
  children: (props: {
    id: string;
    name: string;
    "aria-invalid"?: true;
    "aria-describedby"?: string;
    className: string;
  }) => React.ReactNode;
}) {
  const id = useId();
  const error = errors[name];
  const hintId = hint !== undefined ? `${id}-hint` : undefined;
  const errorId = error !== undefined ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-sm">
        {label}
      </label>
      {hint !== undefined && (
        <p id={hintId} className="mt-0.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {children({
        id,
        name,
        ...(error !== undefined ? { "aria-invalid": true as const } : {}),
        ...(describedBy !== undefined ? { "aria-describedby": describedBy } : {}),
        className: INPUT_CLASS,
      })}
      {error !== undefined && (
        <p id={errorId} className="mt-1 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export function ProjectForm({
  action,
  mode,
  defaults,
  preserved,
}: {
  action: (state: ProjectFormState, form: FormData) => Promise<ProjectFormState>;
  mode: "create" | "edit";
  defaults: ProjectFormValues | null;
  /** Child rows this form does not edit, so the operator knows they survive a save. */
  preserved?: Record<string, number>;
}) {
  const [state, formAction] = useActionState(action, EMPTY);
  const { errors } = state;

  const preservedTotal =
    preserved === undefined ? 0 : Object.values(preserved).reduce((sum, n) => sum + n, 0);

  return (
    <form action={formAction} className="space-y-8" noValidate>
      {mode === "edit" && defaults !== null && (
        <input type="hidden" name="originalSlug" value={defaults.slug} />
      )}

      {/* Live region: a failed save must be announced, not just rendered. */}
      <div aria-live="polite">
        {state.message !== null && (
          <p role="alert" className="rounded border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm">
            {state.message}
          </p>
        )}
      </div>

      <fieldset className="space-y-5">
        <legend className="font-display text-base">Identity</legend>

        <Field name="title" label="Title" errors={errors}>
          {(props) => (
            <input
              {...props}
              type="text"
              required
              maxLength={200}
              defaultValue={defaults?.title ?? ""}
            />
          )}
        </Field>

        <Field
          name="slug"
          label="Slug"
          hint="Appears in the public URL. Lowercase letters, numbers and single hyphens. Changing it on a published project changes its public URL."
          errors={errors}
        >
          {(props) => (
            <input
              {...props}
              type="text"
              required
              maxLength={100}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              defaultValue={defaults?.slug ?? ""}
              className={`${props.className} font-mono`}
            />
          )}
        </Field>

        <Field
          name="shortDescription"
          label="Short description"
          hint="One or two sentences. Shown on cards and in search results."
          errors={errors}
        >
          {(props) => (
            <textarea {...props} required rows={3} maxLength={1000} defaultValue={defaults?.shortDescription ?? ""} />
          )}
        </Field>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="font-display text-base">Classification</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="category" label="Category" errors={errors}>
            {(props) => (
              <select {...props} defaultValue={defaults?.category ?? "supporting"}>
                {PROJECT_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field name="status" label="Status" errors={errors}>
            {(props) => (
              <select {...props} defaultValue={defaults?.status ?? "Completed"}>
                {PROJECT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field
            name="source"
            label="Fact source"
            hint="Where this project's information came from."
            errors={errors}
          >
            {(props) => (
              <select {...props} defaultValue={defaults?.source ?? "GitHub"}>
                {PROJECT_SOURCES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field
            name="displayOrder"
            label="Display order"
            hint="Lower numbers appear first on /projects."
            errors={errors}
          >
            {(props) => (
              <input
                {...props}
                type="number"
                min={0}
                max={9999}
                step={1}
                required
                defaultValue={defaults?.displayOrder ?? 0}
              />
            )}
          </Field>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="featured"
            name="featured"
            type="checkbox"
            defaultChecked={defaults?.featured ?? false}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          <label htmlFor="featured" className="text-sm">
            Featured — show on the home page
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="font-display text-base">Evidence</legend>
        <p className="text-sm text-muted">
          Evidence status is public — it appears as a badge on the project page. The verification
          notes below are internal and are never rendered anywhere a visitor can reach.
        </p>

        <Field name="evidenceStatus" label="Evidence status" errors={errors}>
          {(props) => (
            <select {...props} defaultValue={defaults?.evidenceStatus ?? "self-reported"}>
              {EVIDENCE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field
          name="verificationNotes"
          label="Internal verification notes (never shown publicly)"
          hint="Admin-only working notes: what is evidenced, what is not, what still needs checking. Visitors never see this. Keep [NEEDS INFORMATION] and [NEEDS VERIFICATION] markers until the fact is actually known. Leave blank to clear."
          errors={errors}
        >
          {(props) => (
            <textarea
              {...props}
              rows={4}
              maxLength={5000}
              defaultValue={defaults?.verificationNotes ?? ""}
            />
          )}
        </Field>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="font-display text-base">Technologies and links</legend>

        <Field
          name="technologies"
          label="Technologies"
          hint="One per line, or comma-separated. Duplicates and case variants are merged."
          errors={errors}
        >
          {(props) => (
            <textarea
              {...props}
              rows={5}
              defaultValue={(defaults?.technologies ?? []).join("\n")}
              className={`${props.className} font-mono`}
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="githubUrl" label="GitHub URL" hint="Optional." errors={errors}>
            {(props) => (
              <input {...props} type="url" maxLength={500} defaultValue={defaults?.githubUrl ?? ""} />
            )}
          </Field>

          <Field name="demoUrl" label="Demo URL" hint="Optional." errors={errors}>
            {(props) => (
              <input {...props} type="url" maxLength={500} defaultValue={defaults?.demoUrl ?? ""} />
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="font-display text-base">Publication</legend>

        <Field
          name="publicationStatus"
          label="Publication status"
          hint="Only published projects appear on the public site. A draft stays visible here and nowhere else."
          errors={errors}
        >
          {(props) => (
            <select {...props} defaultValue={defaults?.publicationStatus ?? "draft"}>
              {PUBLICATION_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          )}
        </Field>
      </fieldset>

      {preservedTotal > 0 && preserved !== undefined && (
        <p className="rounded border border-border bg-card px-4 py-3 text-sm text-muted">
          This form does not edit the narrative sections, metrics, results or relationships. Saving
          leaves {preservedTotal} existing child record{preservedTotal === 1 ? "" : "s"} untouched
          ({Object.entries(preserved)
            .filter(([, n]) => n > 0)
            .map(([key, n]) => `${n} ${key}`)
            .join(", ")}
          ).
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-6">
        <SubmitButton label={mode === "create" ? "Create project" : "Save changes"} />
        <Link
          href={defaults === null ? "/admin/projects" : `/admin/projects/${defaults.slug}`}
          className="text-sm text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
