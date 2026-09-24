import type { Metadata } from "next";

import { Panel } from "@/components/admin/admin-ui";
import { DatabaseUnavailableNotice, SourceMismatchNotice } from "@/components/admin/cms-notices";
import {
  PhotoManager,
  ResumeManager,
  type PhotoState,
  type ResumeState,
} from "@/components/admin/media-manager";
import {
  deletePhotoAction,
  deleteResumeAction,
  updatePhotoMetadataAction,
  updateResumeMetadataAction,
  uploadPhotoAction,
  uploadResumeAction,
} from "@/app/admin/(dashboard)/media/actions";
import { DEFAULT_DOWNLOAD_LABEL, formatBytes } from "@/lib/media/media-form";
import { isDatabaseUnavailable } from "@/lib/content/database-availability";
import { requireAdminAuthorized } from "@/lib/auth/session.server";
import {
  PROFILE_PHOTO,
  RESUME,
  getMediaAsset,
  mediaUrl,
  type MediaAssetMeta,
} from "@/lib/repositories/media-repository.server";
import { getActiveSource } from "@/lib/repositories/content-repository.server";

// Media & Documents — CMS_SPECIFICATION.md §32–37,
// ADMIN_DASHBOARD_SPECIFICATION.md §32–36, SECURITY_AND_QUALITY.md §33–40.
//
// Auth-gated: must render per request, never at build time. Guarded here and
// again in generateMetadata, and served by next.config.ts with
// `private, no-store` and `noindex` like every other /admin route.
//
// Like the project CMS, this reads PostgreSQL unconditionally — a form cannot
// edit a file in `public/`. SourceMismatchNotice is what tells the operator
// that uploads are stored but not yet public while CONTENT_SOURCE=typescript.

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // Metadata is produced before the page body, so it gets its own guard.
  await requireAdminAuthorized();
  return {
    title: "Media & documents",
    robots: { index: false, follow: false, nocache: true, noarchive: true },
  };
}

/** Timestamps rendered to the minute, matching the rest of the admin. */
function moment(value: Date): string {
  return value.toISOString().slice(0, 16).replace("T", " ");
}

function toPhotoState(meta: MediaAssetMeta): PhotoState {
  return {
    url: mediaUrl(meta),
    altText: meta.altText ?? "",
    caption: meta.caption ?? "",
    filename: meta.filename,
    size: formatBytes(meta.byteSize),
    dimensions:
      meta.width === null || meta.height === null ? "unknown" : `${meta.width}×${meta.height}`,
    updatedAt: moment(meta.updatedAt),
    updatedBy: meta.updatedBy,
  };
}

function toResumeState(meta: MediaAssetMeta): ResumeState {
  const url = mediaUrl(meta);
  return {
    url,
    // `download=1` flips the Content-Disposition to attachment, so the admin
    // can both preview in a tab and save a copy.
    downloadUrl: `${url}&download=1`,
    title: meta.title ?? "",
    description: meta.caption ?? "",
    downloadLabel: meta.downloadLabel ?? "",
    filename: meta.filename,
    mimeType: meta.mimeType,
    size: formatBytes(meta.byteSize),
    updatedAt: moment(meta.updatedAt),
    updatedBy: meta.updatedBy,
  };
}

const SAVED_MESSAGES: Record<string, string> = {
  photo: "Profile photo saved.",
  "photo-text": "Photo description saved.",
  "photo-deleted": "Profile photo deleted.",
  resume: "Resume saved.",
  "resume-text": "Resume details saved.",
  "resume-deleted": "Resume deleted.",
};

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  // This page's own access control, not inherited from the layout.
  await requireAdminAuthorized();

  let photo: MediaAssetMeta | null;
  let resume: MediaAssetMeta | null;
  let active;
  try {
    [photo, resume, active] = await Promise.all([
      getMediaAsset(PROFILE_PHOTO),
      getMediaAsset(RESUME),
      getActiveSource(),
    ]);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return (
        <div className="space-y-6">
          <h1 className="font-display text-2xl">Media &amp; documents</h1>
          <DatabaseUnavailableNotice />
        </div>
      );
    }
    throw error;
  }

  const { saved } = await searchParams;
  // Looked up rather than interpolated: the value comes off the URL, and an
  // unknown key yields nothing rather than echoing whatever was typed.
  const confirmation = saved === undefined ? null : (SAVED_MESSAGES[saved] ?? null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Media &amp; documents</h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
          The two assets the site serves: the portrait on the home page and the resume linked from
          the navigation. Files are stored in the database alongside their descriptions, so
          replacing one is a single atomic change.
        </p>
      </div>

      {/* §73: a save is confirmed, not inferred from a page that looks right. */}
      <div aria-live="polite">
        {confirmation !== null && (
          <p
            role="status"
            className="rounded-lg border border-emerald-400/40 bg-emerald-400/5 px-4 py-3 text-sm"
          >
            {confirmation}
            {active.source !== "database" &&
              " It is stored, but visitors will not see it until the site runs with CONTENT_SOURCE=database."}
          </p>
        )}
      </div>

      <SourceMismatchNotice activeSource={active.source} />

      <Panel
        title="Profile photo"
        description="Shown on the home page. Alt text is required — it is what a screen reader announces in place of the image."
      >
        <PhotoManager
          photo={photo === null ? null : toPhotoState(photo)}
          uploadAction={uploadPhotoAction}
          updateAction={updatePhotoMetadataAction}
          deleteAction={deletePhotoAction}
        />
      </Panel>

      <Panel
        title="Resume"
        description={`Linked from the navigation and the home page. The public URL stays the same when you replace the file, so existing links keep working. Without a label the button reads "${DEFAULT_DOWNLOAD_LABEL}".`}
      >
        <ResumeManager
          resume={resume === null ? null : toResumeState(resume)}
          uploadAction={uploadResumeAction}
          updateAction={updateResumeMetadataAction}
          deleteAction={deleteResumeAction}
        />
      </Panel>

      <Panel title="What is accepted">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-wide text-muted">Images</dt>
            <dd className="mt-0.5 text-sm">
              JPEG, PNG, WebP · 200×200 to 8000×8000 · up to 5 MB
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] uppercase tracking-wide text-muted">Documents</dt>
            <dd className="mt-0.5 text-sm">PDF · up to 10 MB</dd>
          </div>
        </dl>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted">
          Every upload is checked by reading the file&rsquo;s own bytes, not the type the browser
          reports — so a file renamed to <code className="font-mono text-xs">.png</code> is still
          rejected if it is not really an image. SVG is not accepted: it is an XML document that
          can carry scripts.
        </p>
      </Panel>
    </div>
  );
}
