// Managed media endpoint — Phase 8.
//
// Serves the bytes of a managed asset. This is the only route that reads a
// blob, and the only place `getMediaAssetBytes` is called.
//
// ── Why this is public ────────────────────────────────────────────────────
// SECURITY_AND_QUALITY.md §39 asks that each asset's access level be decided
// deliberately. Both managed assets — the portrait and the resume — exist to
// be seen by visitors, so they are public. There is no draft state for media:
// an asset is live from the moment it is stored, which is why nothing here
// checks a publication status. Deciding otherwise would mean a portrait that
// the site links to but visitors cannot load.
//
// What is *not* public is the metadata around them. This response carries the
// content type, the length, a sanitized download name and a cache validator —
// and nothing else. No `updatedBy`, no timestamps beyond the ETag, no row id,
// no hint that the bytes came from a database rather than a file.
//
// ── Defences on the response ──────────────────────────────────────────────
// These bytes were uploaded. Even though the upload path sniffs the format
// from the magic bytes and refuses anything but JPEG/PNG/WebP/PDF, the
// response is hardened as if that had failed:
//
//   X-Content-Type-Options: nosniff   the browser may not re-interpret a PDF
//                                     or an image as HTML
//   Content-Security-Policy            a served document cannot load or run
//                                     anything, so an embedded script in a
//                                     crafted PDF has nothing to reach
//   Content-Disposition                always names the file explicitly, so a
//                                     browser never guesses from the URL
//
// ── Caching ───────────────────────────────────────────────────────────────
// Public URLs carry `?v=<updatedAt>` (see mediaUrl). When that token matches
// the stored asset the answer can never go stale, so it is cached hard. A
// request without the token, or with an old one, is revalidated every time —
// which is what makes a replacement visible immediately.

import { getMediaAssetBytes } from "@/lib/repositories/media-repository.server";
import { slotFromPath } from "@/lib/media/slots";
import { isDatabaseUnavailable } from "@/lib/content/database-availability";

// Always current: an asset replaced a second ago must not be served from a
// build-time snapshot.
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slot: string }> },
) {
  const { slot: segment } = await params;

  // The path parameter is a controlled vocabulary, not a lookup key. Anything
  // that is not one of the two known slots is a 404 before any query runs —
  // there is no way to spell a filesystem path or a row id here.
  const slot = slotFromPath(segment);
  if (slot === null) return new Response("Not found", { status: 404 });

  let asset;
  try {
    asset = await getMediaAssetBytes(slot);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      // The public pages only link here when the database is the active
      // source, so this is a genuine outage rather than a routine state.
      return new Response("Media is temporarily unavailable", {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }
    throw error;
  }

  // An empty slot is an ordinary state — the portfolio ships with no photo —
  // and the public surfaces render a fallback rather than linking here.
  if (asset === null) return new Response("Not found", { status: 404 });

  const etag = `"${slot}-${asset.updatedAt.getTime()}"`;

  // A conditional request that still matches costs one small query and no
  // bytes on the wire.
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  const requestedVersion = new URL(request.url).searchParams.get("v");
  const isVersioned = requestedVersion === String(asset.updatedAt.getTime());

  const disposition = new URL(request.url).searchParams.get("download") === "1"
    ? "attachment"
    : "inline";

  return new Response(new Uint8Array(asset.data), {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.data.byteLength),
      // The filename was sanitized on upload: no quotes, semicolons, control
      // characters or path separators survive, so it cannot break out of this
      // header value or suggest a directory.
      "Content-Disposition": `${disposition}; filename="${asset.filename}"`,
      ETag: etag,
      "Cache-Control": isVersioned
        ? "public, max-age=31536000, immutable"
        : "public, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
      // Uploaded bytes are never a frame the site itself needs to embed
      // cross-origin.
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
