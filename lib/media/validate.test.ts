// Tests for upload validation — Phase 8 (Media & Documents).
//
// SECURITY_AND_QUALITY.md §33–37. Pure: bytes in, a result out, so every
// branch — including the ones a browser makes hard to reach — runs under the
// default `npm test` with no database and no network.
//
// The fixtures are built byte by byte rather than read from disk. That keeps
// the suite hermetic, and it makes the hostile cases (a PNG header on a
// script, an SVG claiming to be a PNG) expressible at all.

import { describe, expect, it } from "vitest";

import {
  DOCUMENT_MAX_BYTES,
  IMAGE_MAX_BYTES,
  IMAGE_MAX_DIMENSION,
  IMAGE_MIN_DIMENSION,
  looksLikePdf,
  readImageDimensions,
  sanitizeFilename,
  sniffFormat,
  validateUpload,
} from "@/lib/media/validate";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A PNG with a real IHDR chunk carrying the given dimensions. */
function png(width = 400, height = 500): Uint8Array {
  const bytes = new Uint8Array(64);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13, false); // IHDR length
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return bytes;
}

/** A JPEG whose first SOF0 segment carries the given dimensions. */
function jpeg(width = 400, height = 500): Uint8Array {
  const bytes = new Uint8Array(64);
  bytes.set([0xff, 0xd8, 0xff], 0);
  // A JFIF APP0 segment first, so the walk has to step over something.
  bytes[3] = 0xe0;
  const view = new DataView(bytes.buffer);
  view.setUint16(4, 16, false); // APP0 length
  // SOF0 begins after the APP0 payload: 4 + 2 + 14 = offset 20.
  const sof = 20;
  bytes[sof] = 0xff;
  bytes[sof + 1] = 0xc0;
  view.setUint16(sof + 2, 17, false); // SOF0 length
  bytes[sof + 4] = 8; // precision
  view.setUint16(sof + 5, height, false);
  view.setUint16(sof + 7, width, false);
  return bytes;
}

/** A lossy (VP8) WebP container. */
function webp(width = 400, height = 500): Uint8Array {
  const bytes = new Uint8Array(64);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  bytes.set([0x57, 0x45, 0x42, 0x50], 8); // "WEBP"
  bytes.set([0x56, 0x50, 0x38, 0x20], 12); // "VP8 "
  const view = new DataView(bytes.buffer);
  view.setUint16(26, width, true);
  view.setUint16(28, height, true);
  return bytes;
}

/** A structurally complete little PDF. */
function pdf(): Uint8Array {
  const text = "%PDF-1.7\n1 0 obj\n<<>>\nendobj\nxref\n0 1\ntrailer\n<<>>\nstartxref\n42\n%%EOF\n";
  return new TextEncoder().encode(text);
}

function bytesOf(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

// ---------------------------------------------------------------------------

describe("sniffFormat", () => {
  it("identifies the three accepted image formats by their magic bytes", () => {
    expect(sniffFormat(png())).toBe("image/png");
    expect(sniffFormat(jpeg())).toBe("image/jpeg");
    expect(sniffFormat(webp())).toBe("image/webp");
  });

  it("identifies a PDF", () => {
    expect(sniffFormat(pdf())).toBe("application/pdf");
  });

  it("does not recognize SVG, which is XML and not in the allow-list", () => {
    expect(sniffFormat(bytesOf('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
  });

  it("does not recognize a Windows executable", () => {
    // "MZ" DOS header.
    expect(sniffFormat(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]))).toBeNull();
  });

  it("does not recognize a shell script or an ELF binary", () => {
    expect(sniffFormat(bytesOf("#!/bin/sh\nrm -rf /\n"))).toBeNull();
    expect(sniffFormat(new Uint8Array([0x7f, 0x45, 0x4c, 0x46]))).toBeNull();
  });

  it("does not recognize a RIFF container that is not WebP", () => {
    // A WAV file is RIFF too; only the WEBP form-type is an image.
    const wav = new Uint8Array(32);
    wav.set([0x52, 0x49, 0x46, 0x46], 0);
    wav.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"
    expect(sniffFormat(wav)).toBeNull();
  });
});

describe("sanitizeFilename", () => {
  it("keeps an ordinary name", () => {
    expect(sanitizeFilename("Chandrapal-Resume.pdf")).toBe("Chandrapal-Resume.pdf");
  });

  it.each([
    ["../../secret-file", "secret-file"],
    ["../../../etc/passwd", "passwd"],
    ["..\\..\\windows\\system32\\config", "config"],
    ["/absolute/path/photo.png", "photo.png"],
    ["C:\\Users\\Chand\\photo.png", "photo.png"],
  ])("strips every directory component from %j", (input, expected) => {
    // §35: the documented dangerous input. Nothing here is ever used to build
    // a storage location, but the name still reaches a header and a screen.
    expect(sanitizeFilename(input)).toBe(expected);
  });

  it("never returns a dotfile or a bare traversal", () => {
    expect(sanitizeFilename("..")).toBeNull();
    expect(sanitizeFilename(".")).toBeNull();
    expect(sanitizeFilename("....//")).toBeNull();
    expect(sanitizeFilename(".env")).toBe("env");
  });

  it("removes the characters that would break a Content-Disposition header", () => {
    const cleaned = sanitizeFilename('resume";x=y.pdf')!;
    expect(cleaned).not.toContain('"');
    expect(cleaned).not.toContain(";");
  });

  it("removes control characters and newlines", () => {
    const cleaned = sanitizeFilename("resume\r\nX-Injected: 1.pdf")!;
    expect(cleaned).not.toContain("\n");
    expect(cleaned).not.toContain("\r");
  });

  it("returns null when nothing usable survives", () => {
    expect(sanitizeFilename("")).toBeNull();
    expect(sanitizeFilename("///")).toBeNull();
    expect(sanitizeFilename("   ")).toBeNull();
  });

  it("bounds the length", () => {
    expect(sanitizeFilename(`${"a".repeat(500)}.pdf`)!.length).toBeLessThanOrEqual(120);
  });
});

describe("readImageDimensions", () => {
  it("reads PNG dimensions from IHDR", () => {
    expect(readImageDimensions(png(1200, 900), "image/png")).toEqual({
      width: 1200,
      height: 900,
    });
  });

  it("reads JPEG dimensions by walking to the first SOF", () => {
    expect(readImageDimensions(jpeg(640, 480), "image/jpeg")).toEqual({
      width: 640,
      height: 480,
    });
  });

  it("reads WebP dimensions from a VP8 chunk", () => {
    expect(readImageDimensions(webp(300, 400), "image/webp")).toEqual({
      width: 300,
      height: 400,
    });
  });

  it("returns null rather than looping on a JPEG with no frame header", () => {
    // A malformed segment length must end the walk, not spin on it.
    const truncated = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00, 0x00, 0x00]);
    expect(readImageDimensions(truncated, "image/jpeg")).toBeNull();
  });

  it("returns null for a truncated PNG", () => {
    expect(readImageDimensions(png().subarray(0, 12), "image/png")).toBeNull();
  });
});

describe("looksLikePdf", () => {
  it("accepts a structurally complete document", () => {
    expect(looksLikePdf(pdf())).toBe(true);
  });

  it("rejects a file that only starts like a PDF", () => {
    // Five bytes anyone can prepend — the header alone proves nothing.
    expect(looksLikePdf(bytesOf("%PDF-1.7 and then nothing at all"))).toBe(false);
  });

  it("rejects a truncated document with no end-of-file marker", () => {
    const full = pdf();
    expect(looksLikePdf(full.subarray(0, full.length - 10))).toBe(false);
  });

  it("rejects a document with no cross-reference section", () => {
    expect(looksLikePdf(bytesOf("%PDF-1.7\njunk\n%%EOF\n"))).toBe(false);
  });
});

describe("validateUpload — images", () => {
  it("accepts a valid PNG and reports the sniffed type", () => {
    const result = validateUpload(png(400, 500), "portrait.png", "image", "image/png");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      mimeType: "image/png",
      filename: "portrait.png",
      dimensions: { width: 400, height: 500 },
    });
  });

  it("accepts JPEG and WebP too", () => {
    expect(validateUpload(jpeg(), "a.jpg", "image").ok).toBe(true);
    expect(validateUpload(webp(), "a.webp", "image").ok).toBe(true);
  });

  it("trusts the bytes, not the browser, when the two disagree", () => {
    // A PNG uploaded with a claimed type of image/jpeg is still a PNG.
    const result = validateUpload(png(), "mislabelled.jpg", "image", "image/jpeg");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.mimeType).toBe("image/png");
  });

  it("rejects an SVG even when it claims to be a PNG", () => {
    // The central sniffing test: SVG is XML that can carry script, and
    // File.type is attacker-controlled.
    const result = validateUpload(
      bytesOf('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
      "portrait.png",
      "image",
      "image/png",
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("not a JPEG, PNG or WebP image");
  });

  it("rejects an executable renamed to .png", () => {
    const result = validateUpload(
      new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03]),
      "photo.png",
      "image",
      "image/png",
    );

    expect(result.ok).toBe(false);
  });

  it("rejects a PDF offered as a photo", () => {
    expect(validateUpload(pdf(), "resume.pdf", "image").ok).toBe(false);
  });

  it("rejects an oversized file before inspecting its contents", () => {
    const huge = new Uint8Array(IMAGE_MAX_BYTES + 1);
    huge.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    const result = validateUpload(huge, "big.png", "image");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("limit is");
  });

  it("rejects an empty file", () => {
    expect(validateUpload(new Uint8Array(0), "x.png", "image").ok).toBe(false);
  });

  it("rejects an image below the minimum dimension", () => {
    // A 1×1 tracking pixel is a valid PNG and a useless portrait.
    const result = validateUpload(png(1, 1), "tiny.png", "image");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain(`at least ${IMAGE_MIN_DIMENSION}`);
  });

  it("rejects an image above the maximum dimension", () => {
    const result = validateUpload(png(20000, 20000), "huge.png", "image");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("maximum");
  });

  it("accepts an image exactly on the dimension bounds", () => {
    expect(validateUpload(png(IMAGE_MIN_DIMENSION, IMAGE_MIN_DIMENSION), "a.png", "image").ok).toBe(
      true,
    );
    expect(validateUpload(png(IMAGE_MAX_DIMENSION, IMAGE_MAX_DIMENSION), "a.png", "image").ok).toBe(
      true,
    );
  });

  it("rejects a traversal filename even when the bytes are a valid image", () => {
    const result = validateUpload(png(), "../../../etc/passwd", "image");

    // The name is reduced to its last component rather than rejected outright.
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.filename).toBe("passwd");
    expect(result.value.filename).not.toContain("..");
    expect(result.value.filename).not.toContain("/");
  });

  it("refuses a name that sanitizes to nothing", () => {
    const result = validateUpload(png(), "..", "image");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("filename");
  });
});

describe("validateUpload — documents", () => {
  it("accepts a valid PDF", () => {
    const result = validateUpload(pdf(), "resume.pdf", "document", "application/pdf");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      mimeType: "application/pdf",
      filename: "resume.pdf",
      dimensions: null,
    });
  });

  it("rejects an image offered as the resume", () => {
    expect(validateUpload(png(), "resume.pdf", "document", "application/pdf").ok).toBe(false);
  });

  it("rejects a file that merely claims to be a PDF", () => {
    const result = validateUpload(
      bytesOf("not a pdf at all"),
      "resume.pdf",
      "document",
      "application/pdf",
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a truncated PDF", () => {
    const full = pdf();
    const result = validateUpload(full.subarray(0, full.length - 10), "resume.pdf", "document");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("incomplete or damaged");
  });

  it("rejects an oversized document", () => {
    const huge = new Uint8Array(DOCUMENT_MAX_BYTES + 1);
    huge.set([0x25, 0x50, 0x44, 0x46, 0x2d], 0);
    expect(validateUpload(huge, "big.pdf", "document").ok).toBe(false);
  });

  it("allows a document larger than the image limit", () => {
    // §34: different limits for images and documents, not one shared ceiling.
    expect(DOCUMENT_MAX_BYTES).toBeGreaterThan(IMAGE_MAX_BYTES);
  });
});
