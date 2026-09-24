// Managed media storage — Phase 8 (Media & Documents).
//
// The only module in the project that reads or writes asset bytes. Everything
// else — the admin screens, the server actions, the public route handler —
// goes through these functions, so there is exactly one place that knows how
// an asset is stored (CMS_SPECIFICATION.md §34: "Avoid scattering raw file
// paths throughout the application").
//
// It is `server-only`, and like the project repository it assumes the caller
// has already established that the request is the administrator's:
// authorization lives in the server actions, not in the data layer, so it
// cannot be bypassed by calling a repository function from somewhere new.
//
// ── The storage decision ──────────────────────────────────────────────────
// Bytes live in `media_assets.data` (PostgreSQL `bytea`), beside their
// metadata. The alternative — writing into `public/` — is not production-safe:
// Next snapshots `public/` at build time, so a file written there at runtime
// is not served by a built application, and on an ephemeral or read-only
// filesystem it does not survive a deploy at all (SECURITY_AND_QUALITY.md
// §38).
//
// Keeping bytes and metadata in one row buys three properties that a
// filesystem plus a database cannot have together:
//
//   - **Replacement is atomic.** One `upsert` in one transaction. The previous
//     asset remains readable until the new one commits, and a failure anywhere
//     — validation, the write, a constraint — leaves the old asset exactly as
//     it was. There is no window in which the site has no photo.
//   - **No orphans.** A rolled-back write leaves nothing behind, because there
//     is no second system to leave anything in. Nothing needs cleaning up,
//     which is why this module has no cleanup routine.
//   - **No path traversal.** There are no paths. `sanitizeFilename` still runs,
//     but only because the name is displayed and put in a header — it is never
//     used to locate anything.
//
// The cost is that every byte travels through PostgreSQL and the Node runtime.
// For two singleton assets of a few megabytes that is a fair trade; for a real
// media library it would not be. Moving to object storage would change this
// module's write path and the route handler, and nothing else — which is the
// point of routing every access through here.
//
// ── Where this sits relative to CONTENT_SOURCE ────────────────────────────
// Like the project CMS, this operates on PostgreSQL unconditionally: a form
// cannot edit a file in `public/`. Which URL the *public* site uses is decided
// by lib/repositories/content-repository.server.ts, the same single funnel
// every other piece of content goes through.

import "server-only";

import { prisma } from "@/lib/db";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { MediaSlot } from "@/lib/generated/prisma/enums";

import type { ValidatedUpload } from "@/lib/media/validate";

/** The interactive-transaction client Prisma hands to a `$transaction` callback. */
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export const PROFILE_PHOTO: MediaSlot = "profile_photo";
export const RESUME: MediaSlot = "resume";

/** The asset being changed does not exist. */
export class MediaAssetNotFoundError extends Error {
  constructor(public readonly slot: MediaSlot) {
    super(`No media asset in the "${slot}" slot.`);
    this.name = "MediaAssetNotFoundError";
  }
}

/**
 * Everything about an asset except its bytes.
 *
 * Deliberately a separate shape from the row: a listing or an admin screen
 * must never pull a multi-megabyte blob into memory to show a filename and a
 * size.
 */
export interface MediaAssetMeta {
  slot: MediaSlot;
  mimeType: string;
  filename: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  caption: string | null;
  title: string | null;
  downloadLabel: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** An asset's bytes, with just enough to serve them. */
export interface MediaAssetBytes {
  data: Uint8Array;
  mimeType: string;
  filename: string;
  updatedAt: Date;
}

/** The editable, non-binary fields. Every one is optional on an update. */
export interface MediaMetadataInput {
  altText?: string | null;
  caption?: string | null;
  title?: string | null;
  downloadLabel?: string | null;
}

const META_SELECT = {
  slot: true,
  mimeType: true,
  filename: true,
  byteSize: true,
  width: true,
  height: true,
  altText: true,
  caption: true,
  title: true,
  downloadLabel: true,
  updatedBy: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * One asset's metadata, or null when the slot is empty.
 *
 * An empty slot is a normal, representable state — the portfolio ships with no
 * photo — so this returns null rather than throwing, and every caller renders
 * a fallback.
 */
export async function getMediaAsset(
  slot: MediaSlot,
  client: Tx | PrismaClient = prisma,
): Promise<MediaAssetMeta | null> {
  return client.mediaAsset.findUnique({ where: { slot }, select: META_SELECT });
}

/** Every managed asset's metadata, for the admin overview. Never the bytes. */
export async function listMediaAssets(
  client: Tx | PrismaClient = prisma,
): Promise<MediaAssetMeta[]> {
  return client.mediaAsset.findMany({ select: META_SELECT, orderBy: { slot: "asc" } });
}

/**
 * One asset's bytes.
 *
 * The only function that loads a blob. Called by the route handler and by
 * nothing else, so a screen cannot accidentally serialize a file into an RSC
 * payload.
 */
export async function getMediaAssetBytes(
  slot: MediaSlot,
  client: Tx | PrismaClient = prisma,
): Promise<MediaAssetBytes | null> {
  const row = await client.mediaAsset.findUnique({
    where: { slot },
    select: { data: true, mimeType: true, filename: true, updatedAt: true },
  });
  if (row === null) return null;
  return {
    data: row.data as unknown as Uint8Array,
    mimeType: row.mimeType,
    filename: row.filename,
    updatedAt: row.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Store an asset in a slot, replacing whatever was there.
 *
 * ── Why this is an upsert and not delete-then-insert ──────────────────────
 * "Preserve the old photo until the replacement succeeds" and "remove replaced
 * files only after the new file is safely stored" are both consequences of
 * this being one statement on one row. There is no intermediate state in which
 * the slot is empty, so a failure cannot leave the site without a portrait,
 * and there is no separate old file left to clean up afterwards.
 *
 * Metadata the caller does not supply is carried over from the existing row on
 * a replace, so swapping the image file does not silently blank the alt text
 * that was written for it.
 */
export async function putMediaAssetWithin(
  tx: Tx,
  slot: MediaSlot,
  upload: ValidatedUpload,
  data: Uint8Array,
  metadata: MediaMetadataInput = {},
  actor?: string,
): Promise<MediaAssetMeta> {
  const existing = await tx.mediaAsset.findUnique({
    where: { slot },
    select: { altText: true, caption: true, title: true, downloadLabel: true },
  });

  // `??` rather than `||`: an explicit empty string is a real edit meaning
  // "cleared", and must not fall through to the previous value.
  const resolved = {
    altText: metadata.altText ?? existing?.altText ?? null,
    caption: metadata.caption ?? existing?.caption ?? null,
    title: metadata.title ?? existing?.title ?? null,
    downloadLabel: metadata.downloadLabel ?? existing?.downloadLabel ?? null,
  };

  const common = {
    data: Buffer.from(data),
    mimeType: upload.mimeType,
    filename: upload.filename,
    byteSize: upload.byteSize,
    width: upload.dimensions?.width ?? null,
    height: upload.dimensions?.height ?? null,
    ...resolved,
    updatedBy: actor ?? null,
  };

  return tx.mediaAsset.upsert({
    where: { slot },
    create: { slot, ...common },
    update: common,
    select: META_SELECT,
  });
}

/**
 * Change an asset's text without touching its bytes.
 *
 * Editing alt text must not require re-uploading the image, and must not risk
 * the file. `data` is absent from the update, so the blob is never rewritten.
 */
export async function updateMediaMetadataWithin(
  tx: Tx,
  slot: MediaSlot,
  metadata: MediaMetadataInput,
  actor?: string,
): Promise<MediaAssetMeta> {
  const existing = await tx.mediaAsset.findUnique({ where: { slot }, select: { slot: true } });
  if (existing === null) throw new MediaAssetNotFoundError(slot);

  return tx.mediaAsset.update({
    where: { slot },
    data: {
      // Only the keys the caller actually supplied; `undefined` is Prisma's
      // "leave alone", which is exactly the desired meaning here.
      altText: metadata.altText,
      caption: metadata.caption,
      title: metadata.title,
      downloadLabel: metadata.downloadLabel,
      updatedBy: actor ?? null,
    },
    select: META_SELECT,
  });
}

/**
 * Remove an asset entirely.
 *
 * The row and its bytes go together — there is no file left behind to sweep
 * up. The public surface falls back to its placeholder, which is a designed
 * state rather than a broken one.
 */
export async function deleteMediaAssetWithin(tx: Tx, slot: MediaSlot): Promise<void> {
  const existing = await tx.mediaAsset.findUnique({ where: { slot }, select: { slot: true } });
  if (existing === null) throw new MediaAssetNotFoundError(slot);
  await tx.mediaAsset.delete({ where: { slot } });
}

// ---------------------------------------------------------------------------
// Transaction wrappers
// ---------------------------------------------------------------------------

/**
 * A generous timeout: these move megabytes, not rows.
 *
 * The default 5s is sized for ordinary statements. A 10 MB PDF crossing the
 * wire can legitimately take longer, and a timeout here would roll back a
 * perfectly good upload.
 */
const MEDIA_TRANSACTION_OPTIONS = { timeout: 30_000 } as const;

export function putMediaAsset(
  slot: MediaSlot,
  upload: ValidatedUpload,
  data: Uint8Array,
  metadata: MediaMetadataInput = {},
  actor?: string,
): Promise<MediaAssetMeta> {
  return prisma.$transaction(
    (tx) => putMediaAssetWithin(tx, slot, upload, data, metadata, actor),
    MEDIA_TRANSACTION_OPTIONS,
  );
}

export function updateMediaMetadata(
  slot: MediaSlot,
  metadata: MediaMetadataInput,
  actor?: string,
): Promise<MediaAssetMeta> {
  return prisma.$transaction((tx) => updateMediaMetadataWithin(tx, slot, metadata, actor));
}

export function deleteMediaAsset(slot: MediaSlot): Promise<void> {
  return prisma.$transaction((tx) => deleteMediaAssetWithin(tx, slot));
}

// ---------------------------------------------------------------------------
// Public shape
// ---------------------------------------------------------------------------
//
// The projection and the slot vocabulary both live in pure modules under
// lib/media/, not here: this file imports lib/db.ts, which constructs a Prisma
// client at module scope, and neither the public route handler nor the
// database-free test suite should have to pay for that to translate a URL
// segment or strip a row down to its public fields. Re-exported so callers
// still have one obvious place to import from.
export { slotFromPath, slotPath } from "@/lib/media/slots";
export {
  mediaUrl,
  toPublicMediaAsset,
  type PublicMediaAsset,
} from "@/lib/media/public-asset";
