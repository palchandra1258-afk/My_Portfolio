// Tests for media metadata parsing — Phase 8.
//
// Pure: FormData in, a result out. No database, no session, no Next.js.

import { describe, expect, it } from "vitest";

import { formatBytes, parsePhotoMetadata, parseResumeMetadata } from "@/lib/media/media-form";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("parsePhotoMetadata", () => {
  it("accepts alt text with an optional caption", () => {
    const result = parsePhotoMetadata(form({ altText: "Chandrapal at a desk", caption: "2026" }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values).toEqual({ altText: "Chandrapal at a desk", caption: "2026" });
  });

  it("requires alt text, because the portrait is meaningful content", () => {
    // §36 allows an empty-alt strategy for decorative images. A portrait on
    // the home page is not decorative, so a blank alt would leave a screen
    // reader user with nothing at all.
    const result = parsePhotoMetadata(form({ altText: "", caption: "" }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.altText).toBeDefined();
  });

  it("treats whitespace-only alt text as absent", () => {
    expect(parsePhotoMetadata(form({ altText: "   " })).ok).toBe(false);
  });

  it("allows an empty caption, which means there is none", () => {
    const result = parsePhotoMetadata(form({ altText: "A portrait", caption: "" }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.caption).toBe("");
  });

  it("bounds both fields", () => {
    const tooLong = parsePhotoMetadata(form({ altText: "a".repeat(400) }));
    expect(tooLong.ok).toBe(false);

    const captionTooLong = parsePhotoMetadata(
      form({ altText: "ok", caption: "c".repeat(600) }),
    );
    expect(captionTooLong.ok).toBe(false);
    if (captionTooLong.ok) return;
    expect(captionTooLong.errors.caption).toBeDefined();
  });

  it("ignores a non-string value rather than coercing it", () => {
    const data = new FormData();
    data.set("altText", new File(["x"], "x.png"));
    expect(parsePhotoMetadata(data).ok).toBe(false);
  });
});

describe("parseResumeMetadata", () => {
  it("accepts all three fields", () => {
    const result = parseResumeMetadata(
      form({ title: "Résumé", description: "Updated 2026", downloadLabel: "Download CV" }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values).toEqual({
      title: "Résumé",
      description: "Updated 2026",
      downloadLabel: "Download CV",
    });
  });

  it("treats every field as optional — a blank submission clears them", () => {
    const result = parseResumeMetadata(form({ title: "", description: "", downloadLabel: "" }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values).toEqual({ title: "", description: "", downloadLabel: "" });
  });

  it("bounds each field", () => {
    expect(parseResumeMetadata(form({ title: "t".repeat(200) })).ok).toBe(false);
    expect(parseResumeMetadata(form({ description: "d".repeat(600) })).ok).toBe(false);
    expect(parseResumeMetadata(form({ downloadLabel: "l".repeat(60) })).ok).toBe(false);
  });

  it("reports the specific field that was too long", () => {
    const result = parseResumeMetadata(form({ downloadLabel: "l".repeat(60) }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.downloadLabel).toBeDefined();
    expect(result.errors.title).toBeUndefined();
  });
});

describe("formatBytes", () => {
  it("reads naturally at each scale", () => {
    expect(formatBytes(512)).toBe("512 bytes");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
