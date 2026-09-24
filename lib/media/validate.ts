// Upload validation — Phase 8 (Media & Documents).
//
// SECURITY_AND_QUALITY.md §33–37 and CMS_SPECIFICATION.md §37. Every rule
// here runs on the server, on the bytes themselves, after the browser has
// already had its say and been ignored.
//
// ── Why the format is sniffed, not read from the request ──────────────────
// §33: "Never trust the browser-provided MIME type alone." `File.type` is
// attacker-controlled — it is whatever the client wrote in the multipart
// header. A `.png` named file claiming `image/png` can hold anything, and a
// polyglot file can be a valid image *and* a valid script. So the format is
// determined solely by the file's own magic bytes, and the declared type is
// used only to produce a clearer error when the two disagree.
//
// ── Why there is no image library ─────────────────────────────────────────
// Dimensions are parsed straight from the container headers. That is a few
// dozen lines for the three formats the portfolio accepts, and it avoids
// handing untrusted bytes to a decoder — §37 warns about decompression and
// resource exhaustion when processing untrusted files, and the safest decoder
// is the one that is never invoked. Nothing here decodes pixel data; it reads
// integers out of a header and stops.
//
// ── SVG is rejected on purpose ────────────────────────────────────────────
// SVG is an XML document that can carry <script>, external references and
// entity expansions, and it renders in the browser with the page's origin
// when served inline. It is an image format in name only from a security
// standpoint, so it is not in the allow-list (§36: only the types the
// portfolio actually needs).
//
// Pure: bytes in, a result out. No database, no session, no filesystem.

/** What a slot accepts. */
export type MediaKind = "image" | "document";

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ValidatedUpload {
  /** Sniffed from the bytes — never the browser's claim. */
  mimeType: string;
  /** Sanitized; safe to display and to put in a Content-Disposition header. */
  filename: string;
  byteSize: number;
  /** Present for images, null for documents. */
  dimensions: ImageDimensions | null;
}

export type ValidationResult =
  | { ok: true; value: ValidatedUpload }
  | { ok: false; error: string };

// Limits. Generous for a portrait and a resume, but bounded — §34 asks for
// explicit limits chosen from actual requirements, and different ones for
// images and documents. The existing resume is ~104 KB.
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

// Dimension bounds. The lower bound rejects a 1×1 tracking pixel or a
// decorative sliver standing in for a portrait; the upper bound rejects an
// image whose pixel count alone would be a denial-of-service against any
// future resizing step (§37).
export const IMAGE_MIN_DIMENSION = 200;
export const IMAGE_MAX_DIMENSION = 8000;

/** The image types the portfolio accepts. Deliberately excludes SVG. */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPTED_DOCUMENT_TYPES = ["application/pdf"] as const;

/** Extensions offered to the file picker. A convenience, never a security control. */
export const IMAGE_ACCEPT_ATTRIBUTE = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
export const DOCUMENT_ACCEPT_ATTRIBUTE = ".pdf,application/pdf";

// ---------------------------------------------------------------------------
// Filenames
// ---------------------------------------------------------------------------

const MAX_FILENAME_LENGTH = 120;

/**
 * Reduce a browser-supplied filename to something safe to store and display.
 *
 * §35: "Do not use user-provided filenames directly as storage paths." In this
 * design nothing is ever used as a storage path — the bytes go into a database
 * column — so traversal is structurally impossible rather than defended
 * against. This function exists for the two places the name is still used: the
 * admin screen, and the `filename=` parameter of a Content-Disposition header.
 *
 * Everything that could change the meaning of either is removed:
 *   - any directory component, whichever separator produced it
 *   - leading dots, so the result is never a dotfile or a bare traversal
 *   - control characters, quotes, semicolons and newlines, which would let a
 *     crafted name break out of the Content-Disposition value
 *
 * Returns null when nothing usable survives, so the caller supplies its own
 * name rather than storing something meaningless.
 */
export function sanitizeFilename(raw: string): string | null {
  // Take the last path component under either separator. `a/../../b.pdf`
  // becomes `b.pdf`; `../../secret` becomes `secret`.
  const base = raw.split(/[\\/]/).pop() ?? "";

  const cleaned = base
    // Control characters, and the characters that terminate or confuse a
    // Content-Disposition parameter.
    .replace(/[\u0000-\u001f\u007f"';\\]/g, "")
    // Collapse anything outside a conservative allow-list to a hyphen.
    .replace(/[^A-Za-z0-9._ -]/g, "-")
    // No leading dots: rules out ".", "..", and dotfiles.
    .replace(/^\.+/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length === 0) return null;
  // A name consisting only of separators or dots has nothing left to keep.
  if (/^[-.\s]+$/.test(cleaned)) return null;

  return cleaned.slice(0, MAX_FILENAME_LENGTH);
}

// ---------------------------------------------------------------------------
// Format sniffing
// ---------------------------------------------------------------------------

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50]; // "WEBP", at offset 8
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

/** The format a file actually is, by its own bytes. Null when unrecognized. */
export function sniffFormat(bytes: Uint8Array): string | null {
  if (startsWith(bytes, PNG_SIGNATURE)) return "image/png";
  if (startsWith(bytes, JPEG_SIGNATURE)) return "image/jpeg";
  if (startsWith(bytes, RIFF_SIGNATURE) && startsWith(bytes, WEBP_SIGNATURE, 8)) {
    return "image/webp";
  }
  if (startsWith(bytes, PDF_SIGNATURE)) return "application/pdf";
  return null;
}

// ---------------------------------------------------------------------------
// Dimensions, read from container headers only
// ---------------------------------------------------------------------------

/** PNG: IHDR is always the first chunk; width and height are big-endian at 16. */
function pngDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
}

/**
 * JPEG: walk the marker segments to the first Start-Of-Frame.
 *
 * Bounded by construction — every step advances by the segment's own declared
 * length, and a malformed length that would not advance ends the walk. A file
 * with no SOF simply yields null.
 */
function jpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2; // past 0xFFD8

  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];

    // Standalone markers with no payload.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    // Start of scan — compressed data follows, and no SOF was found.
    if (marker === 0xda) return null;

    const length = view.getUint16(offset + 2, false);
    if (length < 2) return null; // Malformed: would not advance.

    // SOF0-SOF15, excluding the non-frame markers in that range.
    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

    if (isStartOfFrame) {
      if (offset + 9 >= bytes.length) return null;
      return {
        height: view.getUint16(offset + 5, false),
        width: view.getUint16(offset + 7, false),
      };
    }

    offset += 2 + length;
  }

  return null;
}

/**
 * WebP: three container variants, each storing the size differently.
 *
 * VP8 (lossy), VP8L (lossless) and VP8X (extended). Only the header of each is
 * read; no bitstream is decoded.
 */
function webpDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 30) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);

  if (chunk === "VP8 ") {
    // 14-bit dimensions follow the 3-byte start code at offset 23.
    return {
      width: view.getUint16(26, true) & 0x3fff,
      height: view.getUint16(28, true) & 0x3fff,
    };
  }

  if (chunk === "VP8L") {
    // 14 bits each, packed across four little-endian bytes from offset 21.
    const packed = view.getUint32(21, true);
    return {
      width: (packed & 0x3fff) + 1,
      height: ((packed >> 14) & 0x3fff) + 1,
    };
  }

  if (chunk === "VP8X") {
    // 24-bit little-endian, stored as (dimension - 1), from offset 24.
    const width = bytes[24] | (bytes[25] << 8) | (bytes[26] << 16);
    const height = bytes[27] | (bytes[28] << 8) | (bytes[29] << 16);
    return { width: width + 1, height: height + 1 };
  }

  return null;
}

/** Dimensions for a recognized image format, or null if they cannot be read. */
export function readImageDimensions(bytes: Uint8Array, format: string): ImageDimensions | null {
  if (format === "image/png") return pngDimensions(bytes);
  if (format === "image/jpeg") return jpegDimensions(bytes);
  if (format === "image/webp") return webpDimensions(bytes);
  return null;
}

// ---------------------------------------------------------------------------
// PDF structure
// ---------------------------------------------------------------------------

/**
 * Is this a structurally plausible PDF?
 *
 * The header alone is a weak signal — `%PDF-` is five bytes anyone can prepend.
 * A real PDF also ends with an `%%EOF` marker and contains a cross-reference
 * section. Checking both rejects a truncated upload and a file that merely
 * starts like a PDF, without parsing the document (§37: do not process
 * untrusted files more than necessary).
 */
export function looksLikePdf(bytes: Uint8Array): boolean {
  if (!startsWith(bytes, PDF_SIGNATURE)) return false;

  // %%EOF lives at the very end, possibly followed by whitespace. 2 KB is a
  // generous window; the marker is normally in the last few dozen bytes.
  const tail = bytes.subarray(Math.max(0, bytes.length - 2048));
  const tailText = new TextDecoder("latin1").decode(tail);
  if (!tailText.includes("%%EOF")) return false;

  // Either a classic cross-reference table or a PDF 1.5+ cross-reference
  // stream. A document with neither cannot be rendered.
  return tailText.includes("startxref") || tailText.includes("/XRef");
}

// ---------------------------------------------------------------------------
// The entry point
// ---------------------------------------------------------------------------

function describeBytes(count: number): string {
  if (count >= 1024 * 1024) return `${(count / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(count / 1024))} KB`;
}

/**
 * Validate an uploaded file for a slot.
 *
 * Order matters and is deliberate: size before content, because a rejected
 * oversized file should not be inspected further; format before dimensions,
 * because dimensions are only meaningful once the format is known.
 *
 * `declaredType` is the browser's claim. It never decides anything — it is
 * used only to explain a mismatch, which is far more useful to an operator
 * than "unsupported file".
 */
export function validateUpload(
  bytes: Uint8Array,
  rawFilename: string,
  kind: MediaKind,
  declaredType?: string,
): ValidationResult {
  if (bytes.length === 0) return { ok: false, error: "That file is empty." };

  const maxBytes = kind === "image" ? IMAGE_MAX_BYTES : DOCUMENT_MAX_BYTES;
  if (bytes.length > maxBytes) {
    return {
      ok: false,
      error: `That file is ${describeBytes(bytes.length)}. The limit is ${describeBytes(maxBytes)}.`,
    };
  }

  const format = sniffFormat(bytes);
  const accepted: readonly string[] =
    kind === "image" ? ACCEPTED_IMAGE_TYPES : ACCEPTED_DOCUMENT_TYPES;

  if (format === null || !accepted.includes(format)) {
    const expected = kind === "image" ? "a JPEG, PNG or WebP image" : "a PDF";
    // Naming the mismatch is the difference between a useful message and a
    // dead end — an SVG or a renamed executable lands here.
    const detail =
      declaredType !== undefined && declaredType.length > 0
        ? ` The upload said it was ${declaredType}, but its contents are ${format ?? "not a supported format"}.`
        : "";
    return { ok: false, error: `That file is not ${expected}.${detail}` };
  }

  const filename = sanitizeFilename(rawFilename);
  if (filename === null) {
    return { ok: false, error: "That filename cannot be used. Rename the file and try again." };
  }

  if (kind === "document") {
    if (!looksLikePdf(bytes)) {
      return {
        ok: false,
        error: "That PDF looks incomplete or damaged — it has no end-of-file marker.",
      };
    }
    return {
      ok: true,
      value: { mimeType: format, filename, byteSize: bytes.length, dimensions: null },
    };
  }

  const dimensions = readImageDimensions(bytes, format);
  if (dimensions === null) {
    return { ok: false, error: "That image's dimensions could not be read. It may be damaged." };
  }
  if (dimensions.width < IMAGE_MIN_DIMENSION || dimensions.height < IMAGE_MIN_DIMENSION) {
    return {
      ok: false,
      error: `That image is ${dimensions.width}×${dimensions.height}. It must be at least ${IMAGE_MIN_DIMENSION}×${IMAGE_MIN_DIMENSION}.`,
    };
  }
  if (dimensions.width > IMAGE_MAX_DIMENSION || dimensions.height > IMAGE_MAX_DIMENSION) {
    return {
      ok: false,
      error: `That image is ${dimensions.width}×${dimensions.height}. The maximum is ${IMAGE_MAX_DIMENSION}×${IMAGE_MAX_DIMENSION}.`,
    };
  }

  return {
    ok: true,
    value: { mimeType: format, filename, byteSize: bytes.length, dimensions },
  };
}
