"use server";

// Media server actions — Phase 8 (Media & Documents).
//
// A Server Action is a separately addressable HTTP endpoint. It does not pass
// through the admin layout, the page guard, or any client-side routing, so
// each one establishes its own caller identity before touching anything
// (SECURITY_AND_QUALITY.md §6, ADMIN_DASHBOARD_SPECIFICATION.md §89). An
// unauthenticated POST straight at these endpoints is redirected, not served.
//
// Order is deliberate in every action:
//   1. authorize   — before the upload is even read from the request
//   2. validate    — server-side, on the bytes themselves
//   3. write       — one transaction
//   4. revalidate  — so the public site reflects the change in database mode
//   5. redirect    — outside any try/catch, because it throws to unwind
//
// ── CSRF ──────────────────────────────────────────────────────────────────
// This uses the project's existing mutation pattern, which is what carries the
// CSRF protection. Next Server Actions are POST-only, addressed by an
// unguessable build-specific action id rather than a stable URL, and the
// framework rejects a request whose Origin does not match the Host before any
// of this code runs. On top of that the session cookie is SameSite (see
// lib/auth/session.server.ts), so a cross-site form post carries no identity
// even if it reached the endpoint. No hand-rolled token is added, because a
// second mechanism layered on the framework's own would be one more thing to
// get wrong, not one more line of defence.
//
// ── What "transactional" means here ───────────────────────────────────────
// The asset's bytes and its metadata are one row, so a replace is a single
// upsert inside a single transaction. The previous asset stays readable until
// the new one commits; a failure at any point — validation, the write, the
// database going away — leaves the old asset exactly as it was. There is no
// second file to clean up and no window in which the slot is empty.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminAuthorized } from "@/lib/auth/session.server";
import {
  parsePhotoMetadata,
  parseResumeMetadata,
  type MediaFieldErrors,
} from "@/lib/media/media-form";
import { validateUpload } from "@/lib/media/validate";
import {
  MediaAssetNotFoundError,
  PROFILE_PHOTO,
  RESUME,
  deleteMediaAsset,
  putMediaAsset,
  updateMediaMetadata,
} from "@/lib/repositories/media-repository.server";

export interface MediaFormState {
  errors: MediaFieldErrors;
  /** A form-level failure that belongs to no single field. */
  message: string | null;
  /** Set after a successful change, for the confirmation region. */
  success: string | null;
}

// NB: this module must export nothing but async functions and types. A
// "use server" file's exports all become callable HTTP endpoints, so Next
// rejects a plain `const` export at build time.

/**
 * Refresh everything an asset appears on.
 *
 * The resume link lives in the site-wide navigation and the portrait is on the
 * home page, so this revalidates the whole tree under the root layout rather
 * than naming pages one by one — a list that would silently go stale the next
 * time a link moved.
 *
 * Only has an effect when the public site is reading the database; in
 * TypeScript mode the public pages serve the committed files in `public/` and
 * this is a no-op. The admin screens are `force-dynamic` and always show the
 * managed asset either way.
 */
function revalidateMedia(): void {
  revalidatePath("/", "layout");
  revalidatePath("/admin/media");
}

/**
 * Pull the uploaded file out of the request and read its bytes.
 *
 * Returns a discriminated result rather than throwing: "no file chosen" is an
 * ordinary mistake, not an exception.
 */
async function readUpload(
  formData: FormData,
  field: string,
): Promise<{ ok: true; bytes: Uint8Array; name: string; declaredType: string } | { ok: false }> {
  const file = formData.get(field);
  if (!(file instanceof File) || file.size === 0) return { ok: false };

  const bytes = new Uint8Array(await file.arrayBuffer());
  return { ok: true, bytes, name: file.name, declaredType: file.type };
}

// ---------------------------------------------------------------------------
// Profile photo
// ---------------------------------------------------------------------------

/**
 * Upload or replace the portrait.
 *
 * The bytes are validated by sniffing the file's own magic numbers, not by
 * believing the browser (SECURITY_AND_QUALITY.md §33). An SVG, a renamed
 * executable, an oversized file or an image outside the dimension bounds is
 * rejected here, before anything is written, so the existing photo survives a
 * bad upload untouched.
 */
export async function uploadPhotoAction(
  _previous: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const session = await requireAdminAuthorized();

  const upload = await readUpload(formData, "file");
  if (!upload.ok) {
    return { errors: {}, message: "Choose an image to upload.", success: null };
  }

  const metadata = parsePhotoMetadata(formData);
  if (!metadata.ok) {
    return {
      errors: metadata.errors,
      message: "Nothing was saved — check the fields below.",
      success: null,
    };
  }

  const validated = validateUpload(upload.bytes, upload.name, "image", upload.declaredType);
  if (!validated.ok) {
    // The previous photo is untouched: nothing has been written at this point.
    return { errors: { file: validated.error }, message: "Nothing was saved.", success: null };
  }

  await putMediaAsset(
    PROFILE_PHOTO,
    validated.value,
    upload.bytes,
    { altText: metadata.values.altText, caption: metadata.values.caption },
    session.sub,
  );

  revalidateMedia();
  redirect("/admin/media?saved=photo");
}

/** Change the portrait's alt text and caption without touching the image. */
export async function updatePhotoMetadataAction(
  _previous: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const session = await requireAdminAuthorized();

  const metadata = parsePhotoMetadata(formData);
  if (!metadata.ok) {
    return {
      errors: metadata.errors,
      message: "Nothing was saved — check the fields below.",
      success: null,
    };
  }

  try {
    await updateMediaMetadata(
      PROFILE_PHOTO,
      { altText: metadata.values.altText, caption: metadata.values.caption },
      session.sub,
    );
  } catch (error) {
    if (error instanceof MediaAssetNotFoundError) {
      return {
        errors: {},
        message: "There is no photo to describe yet. Upload one first.",
        success: null,
      };
    }
    throw error;
  }

  revalidateMedia();
  redirect("/admin/media?saved=photo-text");
}

/** Remove the portrait. The public surface falls back to its placeholder. */
export async function deletePhotoAction(
  // Both parameters are required by the useActionState signature; a delete
  // needs neither, because the slot is fixed and the session is the authority.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _previous: MediaFormState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<MediaFormState> {
  await requireAdminAuthorized();

  try {
    await deleteMediaAsset(PROFILE_PHOTO);
  } catch (error) {
    if (error instanceof MediaAssetNotFoundError) {
      return { errors: {}, message: "There is no photo to delete.", success: null };
    }
    throw error;
  }

  revalidateMedia();
  redirect("/admin/media?saved=photo-deleted");
}

// ---------------------------------------------------------------------------
// Resume
// ---------------------------------------------------------------------------

/**
 * Upload or replace the resume.
 *
 * Validated as a PDF by its header *and* its end-of-file marker, so a
 * truncated upload is refused rather than published as a document that will
 * not open. The public download URL is stable across replacements — it names
 * the slot, not the file — so an existing link keeps working.
 */
export async function uploadResumeAction(
  _previous: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const session = await requireAdminAuthorized();

  const upload = await readUpload(formData, "file");
  if (!upload.ok) {
    return { errors: {}, message: "Choose a PDF to upload.", success: null };
  }

  const metadata = parseResumeMetadata(formData);
  if (!metadata.ok) {
    return {
      errors: metadata.errors,
      message: "Nothing was saved — check the fields below.",
      success: null,
    };
  }

  const validated = validateUpload(upload.bytes, upload.name, "document", upload.declaredType);
  if (!validated.ok) {
    // The previous resume is untouched.
    return { errors: { file: validated.error }, message: "Nothing was saved.", success: null };
  }

  await putMediaAsset(
    RESUME,
    validated.value,
    upload.bytes,
    {
      title: metadata.values.title,
      caption: metadata.values.description,
      downloadLabel: metadata.values.downloadLabel,
    },
    session.sub,
  );

  revalidateMedia();
  redirect("/admin/media?saved=resume");
}

/** Change the resume's title, description and download label. */
export async function updateResumeMetadataAction(
  _previous: MediaFormState,
  formData: FormData,
): Promise<MediaFormState> {
  const session = await requireAdminAuthorized();

  const metadata = parseResumeMetadata(formData);
  if (!metadata.ok) {
    return {
      errors: metadata.errors,
      message: "Nothing was saved — check the fields below.",
      success: null,
    };
  }

  try {
    await updateMediaMetadata(
      RESUME,
      {
        title: metadata.values.title,
        caption: metadata.values.description,
        downloadLabel: metadata.values.downloadLabel,
      },
      session.sub,
    );
  } catch (error) {
    if (error instanceof MediaAssetNotFoundError) {
      return {
        errors: {},
        message: "There is no resume to describe yet. Upload one first.",
        success: null,
      };
    }
    throw error;
  }

  revalidateMedia();
  redirect("/admin/media?saved=resume-text");
}

/** Remove the resume. Public surfaces stop offering the download. */
export async function deleteResumeAction(
  // Both parameters are required by the useActionState signature; a delete
  // needs neither, because the slot is fixed and the session is the authority.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _previous: MediaFormState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<MediaFormState> {
  await requireAdminAuthorized();

  try {
    await deleteMediaAsset(RESUME);
  } catch (error) {
    if (error instanceof MediaAssetNotFoundError) {
      return { errors: {}, message: "There is no resume to delete.", success: null };
    }
    throw error;
  }

  revalidateMedia();
  redirect("/admin/media?saved=resume-deleted");
}
