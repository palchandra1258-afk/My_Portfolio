// The public projection of a managed asset — Phase 8.
//
// The trust boundary for media, and the direct counterpart of
// lib/content/public-project.ts. Same reasoning, same shape:
//
//   A type-level `Omit` is not enough. React Server Components serialize the
//   props they are given into the HTML response, so a field that is merely
//   absent from a TypeScript type but present on the object at runtime still
//   ships to the browser. The projection therefore happens at runtime, by an
//   explicit allow-list, and is deny-by-default: a column added to the
//   `media_assets` table does not reach a public page unless someone writes a
//   line here to let it through.
//
// Pure, and deliberately in its own module rather than beside the repository —
// the repository imports lib/db.ts, which constructs a Prisma client at module
// scope. Keeping the projection separate is what lets it be verified under the
// database-free `npm test`, which is where a boundary like this belongs.

import { slotPath, type MediaSlotName } from "@/lib/media/slots";

/**
 * The fields of a managed asset that a public page may see.
 *
 * Absent by construction, not by filtering: `updatedBy` (who the
 * administrator is), `byteSize`, `createdAt`, `updatedAt`, the row id, and
 * anything describing how or where the bytes are stored.
 */
export interface PublicMediaAsset {
  /** Stable path plus a version token, so a replacement is visible at once. */
  url: string;
  mimeType: string;
  /** The name a download is offered under. Sanitized at upload time. */
  filename: string;
  width: number | null;
  height: number | null;
  altText: string | null;
  caption: string | null;
  title: string | null;
  downloadLabel: string | null;
}

/** The subset of a stored asset this projection reads. */
export interface ProjectableAsset {
  slot: MediaSlotName;
  mimeType: string;
  filename: string;
  width: number | null;
  height: number | null;
  altText: string | null;
  caption: string | null;
  title: string | null;
  downloadLabel: string | null;
  updatedAt: Date;
}

/**
 * The URL a public page should use for an asset.
 *
 * The path names the *slot*, not the file, which is what keeps a link working
 * across a replacement — the whole point of "the public resume download link
 * keeps working after replacement".
 *
 * The `?v=` token is the asset's last-modified time. It changes the URL
 * whenever the bytes change, so a cached copy of the old URL can never be
 * served in place of the new asset, and the unchanged URL can be cached hard.
 */
export function mediaUrl(asset: Pick<ProjectableAsset, "slot" | "updatedAt">): string {
  return `/media/${slotPath(asset.slot)}?v=${asset.updatedAt.getTime()}`;
}

/** Project a stored asset down to what the public may see. */
export function toPublicMediaAsset(asset: ProjectableAsset): PublicMediaAsset {
  return {
    url: mediaUrl(asset),
    mimeType: asset.mimeType,
    filename: asset.filename,
    width: asset.width,
    height: asset.height,
    altText: asset.altText,
    caption: asset.caption,
    title: asset.title,
    downloadLabel: asset.downloadLabel,
  };
}
