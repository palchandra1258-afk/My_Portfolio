"use server";

// Project create/update server actions — Phase 7.
//
// A Server Action is a separately addressable HTTP endpoint. It does not pass
// through the admin layout, the page guard, or any client-side routing, so
// each one establishes its own caller identity before touching anything
// (SECURITY_AND_QUALITY.md §6, ADMIN_DASHBOARD_SPECIFICATION.md §89). An
// unauthenticated POST straight at these endpoints is redirected, not served.
//
// Order is deliberate in both actions:
//   1. authorize   — before the input is even parsed
//   2. validate    — server-side, on the raw FormData
//   3. write       — one transaction
//   4. revalidate  — so the public site reflects the change in database mode
//   5. redirect    — outside any try/catch, because it throws to unwind
//
// Nothing here trusts a hidden field for authorization. `originalSlug` says
// *which* project to edit, and tampering with it can only reach another
// project the same administrator is already entitled to edit.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseProjectForm, type ProjectFieldErrors } from "@/lib/admin/project-form";
import { requireAdminAuthorized } from "@/lib/auth/session.server";
import {
  DuplicateSlugError,
  InvalidRevisionError,
  ProjectNotFoundError,
  RevisionNotFoundError,
  createProject,
  restoreProjectRevision,
  setPublicationStatus,
  updateProject,
} from "@/lib/repositories/admin-project-repository.server";
import type { PublicationStatus } from "@/lib/generated/prisma/enums";

export interface ProjectFormState {
  errors: ProjectFieldErrors;
  /** A form-level failure that belongs to no single field. */
  message: string | null;
}

// NB: this module must export nothing but async functions and types. A
// "use server" file's exports all become callable HTTP endpoints, so Next
// rejects a plain `const` export at build time. The form's initial state lives
// in the component that uses it.

/**
 * Refresh everything a project appears on.
 *
 * Only has an effect when the public site is reading the database; in
 * TypeScript mode the pages are generated from content/*.ts and this is a
 * no-op. Both old and new slug are revalidated so a rename does not leave the
 * previous URL cached.
 */
function revalidateProject(slug: string, previousSlug?: string): void {
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath(`/projects/${slug}`);
  if (previousSlug !== undefined && previousSlug !== slug) {
    revalidatePath(`/projects/${previousSlug}`);
  }
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/projects");
}

export async function createProjectAction(
  _previous: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  // The session is both the authorization and the revision's author: §20
  // leaves `created_by` nullable for a future users table, and until that
  // exists the session subject is the only real identity available. Never a
  // value taken from the form.
  const session = await requireAdminAuthorized();

  const parsed = parseProjectForm(formData);
  if (!parsed.ok) {
    return { errors: parsed.errors, message: "Nothing was saved — check the fields below." };
  }

  try {
    await createProject(parsed.values, { actor: session.sub });
  } catch (error) {
    if (error instanceof DuplicateSlugError) {
      // Reported on the field, not as a generic failure — the operator needs
      // to know which value to change.
      return {
        errors: { slug: `The slug "${error.slug}" is already used by another project.` },
        message: "Nothing was saved.",
      };
    }
    throw error;
  }

  revalidateProject(parsed.values.slug);
  redirect(`/admin/projects/${parsed.values.slug}?saved=created`);
}

export async function updateProjectAction(
  _previous: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const session = await requireAdminAuthorized();

  const originalSlugRaw = formData.get("originalSlug");
  if (typeof originalSlugRaw !== "string" || originalSlugRaw.length === 0) {
    return { errors: {}, message: "This form is missing the project it was editing." };
  }
  const originalSlug = originalSlugRaw;

  const parsed = parseProjectForm(formData);
  if (!parsed.ok) {
    return { errors: parsed.errors, message: "Nothing was saved — check the fields below." };
  }

  try {
    await updateProject(originalSlug, parsed.values, { actor: session.sub });
  } catch (error) {
    if (error instanceof DuplicateSlugError) {
      return {
        errors: { slug: `The slug "${error.slug}" is already used by another project.` },
        message: "Nothing was saved.",
      };
    }
    if (error instanceof ProjectNotFoundError) {
      return {
        errors: {},
        message: "That project no longer exists. It may have been removed in another session.",
      };
    }
    throw error;
  }

  revalidateProject(parsed.values.slug, originalSlug);
  redirect(`/admin/projects/${parsed.values.slug}?saved=updated`);
}

// ---------------------------------------------------------------------------
// Publish / unpublish (CMS_SPECIFICATION.md §45, §46)
// ---------------------------------------------------------------------------

/**
 * Change a project's publication state.
 *
 * Shared by both actions so the authorization check, the slug validation and
 * the revalidation set cannot drift between them.
 *
 * The `slug` field is an identifier, not a credential. Tampering with it can
 * only reach another project the same administrator is already entitled to
 * publish — authorization comes from the session, which is checked first and
 * cannot be influenced by anything in the form.
 */
async function changePublication(
  formData: FormData,
  status: PublicationStatus,
): Promise<ProjectFormState> {
  const session = await requireAdminAuthorized();

  const slugRaw = formData.get("slug");
  if (typeof slugRaw !== "string" || slugRaw.length === 0) {
    return { errors: {}, message: "This action did not say which project to change." };
  }

  let change;
  try {
    change = await setPublicationStatus(slugRaw, status, { actor: session.sub });
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      // A safe, specific failure rather than a 500 — the project may have been
      // removed in another session since the page rendered.
      return {
        errors: {},
        message: "That project no longer exists. It may have been removed in another session.",
      };
    }
    throw error;
  }

  revalidateProject(change.slug);
  redirect(
    `/admin/projects/${change.slug}?saved=${status === "published" ? "published" : "unpublished"}`,
  );
}

/** Make a project visible on the public site. */
export async function publishProjectAction(
  _previous: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  return changePublication(formData, "published");
}

/**
 * Remove a project from the public site without deleting it (§46).
 *
 * Sets `draft`, never `archived`, and never touches content: the project keeps
 * every field and child row, and `published_at` is preserved so the record of
 * when it first went live survives.
 */
export async function unpublishProjectAction(
  _previous: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  return changePublication(formData, "draft");
}

// ---------------------------------------------------------------------------
// Restore (CMS_SPECIFICATION.md §49, ADMIN_DASHBOARD_SPECIFICATION.md §59)
// ---------------------------------------------------------------------------

/**
 * Restore a project to one of its earlier revisions.
 *
 * Both `slug` and `revisionId` arrive as form data and neither authorizes
 * anything — the session does, and it is established first. The pair is then
 * required to match in the database, so a guessed revision id cannot reach
 * another project's history: it simply does not resolve.
 *
 * The revision id is validated as a positive integer here rather than being
 * handed to Prisma as-is. `Number("")` is 0 and `Number("1e9999")` is
 * Infinity; neither belongs in a query, and neither should surface as a
 * 500 when the honest answer is "that is not a revision".
 *
 * This does not publish. The repository keeps the project's current
 * publication state, so restoring content on a live project changes what it
 * says without changing whether it is visible, and restoring on a draft leaves
 * it a draft.
 */
export async function restoreRevisionAction(
  _previous: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const session = await requireAdminAuthorized();

  const slugRaw = formData.get("slug");
  if (typeof slugRaw !== "string" || slugRaw.length === 0) {
    return { errors: {}, message: "This action did not say which project to restore." };
  }

  const revisionRaw = formData.get("revisionId");
  const revisionId = typeof revisionRaw === "string" ? Number(revisionRaw) : Number.NaN;
  if (!Number.isInteger(revisionId) || revisionId <= 0) {
    return { errors: {}, message: "This action did not say which revision to restore." };
  }

  let result;
  try {
    result = await restoreProjectRevision(slugRaw, revisionId, { actor: session.sub });
  } catch (error) {
    if (error instanceof RevisionNotFoundError) {
      return {
        errors: {},
        message: "That revision is not part of this project's history. Nothing was changed.",
      };
    }
    if (error instanceof InvalidRevisionError) {
      // The stored content no longer passes the editor's own validation —
      // usually a vocabulary that has changed since. Surfaced per field so the
      // operator can copy the usable parts across by hand.
      return {
        errors: error.errors,
        message:
          "That revision can no longer be restored as-is: the content below is no longer valid. Nothing was changed.",
      };
    }
    if (error instanceof DuplicateSlugError) {
      // The revision carries the slug the project had at the time, and another
      // project has taken it since.
      return {
        errors: { slug: `The slug "${error.slug}" is now used by another project.` },
        message: "Nothing was restored.",
      };
    }
    if (error instanceof ProjectNotFoundError) {
      return {
        errors: {},
        message: "That project no longer exists. It may have been removed in another session.",
      };
    }
    throw error;
  }

  // The slug may have moved back to what it was at the restored revision, so
  // the old URL is revalidated too.
  revalidateProject(result.slug, slugRaw);
  redirect(`/admin/projects/${result.slug}?saved=restored&from=${result.restoredFrom}`);
}
