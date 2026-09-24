// Media on the public surface — Phase 8.
//
// Two questions, both about the boundary:
//
//   1. does a visitor see the active asset, and a sane fallback when there is
//      none?
//   2. does anything administrative travel with it?
//
// The second matters more than it looks. RSC serializes props into the HTML
// response, so "the type doesn't include it" is not an answer — an asset row
// carries `updatedBy` (an administrator's identity), byte sizes and
// timestamps, and none of that may reach a page. The projection in
// lib/media/public-asset.ts is what prevents it, and these tests are what stop
// someone routing around the projection later.

import { describe, expect, it, vi } from "vitest";

import { mediaUrl, toPublicMediaAsset } from "@/lib/media/public-asset";
import { slotFromPath, slotPath } from "@/lib/media/slots";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => ({ type: "img", props }),
}));

const UPDATED_AT = new Date("2026-09-24T12:00:00.000Z");

/** A stored row, including every administrative field the projection must drop. */
function storedAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    slot: "profile_photo" as const,
    data: new Uint8Array([1, 2, 3]),
    mimeType: "image/png",
    filename: "portrait.png",
    byteSize: 204_800,
    width: 800,
    height: 1000,
    altText: "Chandrapal at a desk",
    caption: "Taken in 2026",
    title: null,
    downloadLabel: null,
    updatedBy: "admin@example.com",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------

describe("the public projection", () => {
  it("keeps exactly the fields a page needs", () => {
    const projected = toPublicMediaAsset(storedAsset());

    expect(Object.keys(projected).sort()).toEqual([
      "altText",
      "caption",
      "downloadLabel",
      "filename",
      "height",
      "mimeType",
      "title",
      "url",
      "width",
    ]);
  });

  it("drops every administrative field, including who uploaded it", () => {
    // The decisive one. `updatedBy` is an administrator's identity and would
    // otherwise be serialized straight into the HTML of the home page.
    const projected = toPublicMediaAsset(storedAsset()) as unknown as Record<string, unknown>;

    expect(projected.updatedBy).toBeUndefined();
    expect(projected.byteSize).toBeUndefined();
    expect(projected.createdAt).toBeUndefined();
    expect(projected.updatedAt).toBeUndefined();
    expect(projected.id).toBeUndefined();
    expect(projected.data).toBeUndefined();
    expect(projected.slot).toBeUndefined();
  });

  it("leaves no administrative value in the serialized payload", () => {
    // What actually ships is the serialization, so that is what is checked.
    const serialized = JSON.stringify(toPublicMediaAsset(storedAsset()));

    expect(serialized).not.toContain("admin@example.com");
    expect(serialized).not.toContain("204800");
    expect(serialized).not.toContain("media_assets");
    expect(serialized).not.toContain("bytea");
  });

  it("is deny-by-default — a new column does not leak", () => {
    const withNewColumn = storedAsset({ internalReviewNote: "not for visitors" });
    const serialized = JSON.stringify(
      toPublicMediaAsset(withNewColumn as Parameters<typeof toPublicMediaAsset>[0]),
    );

    expect(serialized).not.toContain("not for visitors");
  });

  it("exposes no filesystem path or storage key", () => {
    const projected = toPublicMediaAsset(storedAsset());

    expect(projected.url).toBe(`/media/profile-photo?v=${UPDATED_AT.getTime()}`);
    expect(projected.url).not.toContain("public/");
    expect(projected.url).not.toContain("..");
    expect(projected.url).not.toMatch(/[A-Za-z]:\\/);
  });
});

describe("asset URLs", () => {
  it("names the slot, not the file, so a link survives replacement", () => {
    // "Keep the public resume download link working after replacement": the
    // path is stable because it never contained the filename.
    const first = mediaUrl({ slot: "resume", updatedAt: new Date("2026-01-01T00:00:00Z") });
    const second = mediaUrl({ slot: "resume", updatedAt: new Date("2026-06-01T00:00:00Z") });

    expect(first.split("?")[0]).toBe("/media/resume");
    expect(second.split("?")[0]).toBe("/media/resume");
  });

  it("changes its version token when the asset changes, defeating a stale cache", () => {
    const before = mediaUrl({ slot: "resume", updatedAt: new Date("2026-01-01T00:00:00Z") });
    const after = mediaUrl({ slot: "resume", updatedAt: new Date("2026-06-01T00:00:00Z") });

    expect(before).not.toBe(after);
  });

  it("round-trips both slots through the URL vocabulary", () => {
    for (const slot of ["profile_photo", "resume"] as const) {
      expect(slotFromPath(slotPath(slot))).toBe(slot);
    }
  });

  it("refuses to resolve anything outside the vocabulary", () => {
    for (const hostile of [
      "../../../etc/passwd",
      "profile-photo/../../secret",
      "constructor",
      "__proto__",
      "toString",
      "",
      "PROFILE-PHOTO",
    ]) {
      expect(slotFromPath(hostile)).toBeNull();
    }
  });
});

describe("the navigation's resume guard", () => {
  // Regression, as a predicate rather than a render.
  //
  // The guard in components/nav.tsx was `resume !== null`, which is *true* for
  // `undefined` — so a render that reached Nav without the prop fell straight
  // into `resume.url` and threw:
  //
  //   TypeError: Cannot read properties of undefined (reading 'url')
  //       at Nav (components/nav.tsx:84:28)
  //
  // It is now `resume != null`. Nav itself is a Client Component using
  // `useState`, which React's react-server build — the condition this suite
  // resolves under — does not provide, so rendering it here is not possible
  // without shimming hooks. The operator's behaviour is what regressed and is
  // what is pinned; the rendered component is covered by requesting the live
  // page.
  it.each([
    [null, false],
    [undefined, false],
    [{ url: "/media/resume?v=1", filename: "resume.pdf", label: "Resume" }, true],
  ])("renders the link for %j: %s", (resume, expected) => {
    expect(resume != null).toBe(expected);
  });

  it("is the loose comparison, which the strict one got wrong", () => {
    // The exact defect: strict inequality admits undefined.
    expect(undefined !== null).toBe(true);
    expect(undefined != null).toBe(false);
  });
});

describe("the portrait", () => {
  it("renders the active photo with the alt text the owner wrote", async () => {
    const { Portrait } = await import("@/components/portrait");
    const tree = Portrait({ photo: toPublicMediaAsset(storedAsset()) });
    const serialized = JSON.stringify(tree);

    expect(serialized).toContain("/media/profile-photo");
    expect(serialized).toContain("Chandrapal at a desk");
    expect(serialized).not.toContain("Photo coming soon");
  });

  it("falls back to the placeholder when there is no photo", async () => {
    // A designed state, never a broken image.
    const { Portrait } = await import("@/components/portrait");
    const serialized = JSON.stringify(Portrait({ photo: null }));

    expect(serialized).toContain("Photo coming soon");
    expect(serialized).not.toContain("/media/");
  });

  it("does not send an administrator's identity to the browser", async () => {
    const { Portrait } = await import("@/components/portrait");
    const serialized = JSON.stringify(Portrait({ photo: toPublicMediaAsset(storedAsset()) }));

    expect(serialized).not.toContain("admin@example.com");
    expect(serialized).not.toContain("204800");
  });

  it("describes the subject rather than inventing alt text from a filename", async () => {
    // §36 forbids deriving alt text from a filename. A committed static file
    // has no stored alt text, so a written description stands in.
    const { Portrait } = await import("@/components/portrait");
    const staticPhoto = toPublicMediaAsset(
      storedAsset({ altText: null, filename: "IMG_20260924_001.jpg" }),
    );
    const serialized = JSON.stringify(Portrait({ photo: staticPhoto }));

    expect(serialized).not.toContain("IMG_20260924_001");
    expect(serialized).toContain("AI/ML Engineer");
  });

  it("does not send a database-backed image through the image optimizer", async () => {
    const { Portrait } = await import("@/components/portrait");
    const managed = JSON.stringify(Portrait({ photo: toPublicMediaAsset(storedAsset()) }));
    expect(managed).toContain('"unoptimized":true');

    const staticFile = JSON.stringify(
      Portrait({
        photo: {
          url: "/images/profile.jpg",
          mimeType: "image/jpeg",
          filename: "profile.jpg",
          width: null,
          height: null,
          altText: null,
          caption: null,
          title: null,
          downloadLabel: null,
        },
      }),
    );
    expect(staticFile).toContain('"unoptimized":false');
  });
});
