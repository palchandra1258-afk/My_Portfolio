// Tests for the media server actions — Phase 8.
//
// A Server Action is a separately addressable HTTP endpoint, reachable without
// ever loading the page that renders the form, so its own authorization check
// is the only thing between an anonymous POST and a write that replaces what
// the site shows. These tests assert that check fires first — before the
// upload is read and long before anything is stored
// (SECURITY_AND_QUALITY.md §6, ADMIN_DASHBOARD_SPECIFICATION.md §89).
//
// The repository is mocked: it imports lib/db.ts, which throws without
// DATABASE_URL by design, and `npm test` must stay runnable with no
// PostgreSQL. The real transactional behaviour is covered by
// lib/repositories/media-repository.db.test.ts under `npm run test:db`.
//
// Validation is NOT mocked. It is pure, it is the security boundary, and the
// point of several of these tests is that a hostile upload is rejected by the
// action before the repository is reached at all.

import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAuthorized = vi.fn();
const putMediaAsset = vi.fn();
const updateMediaMetadata = vi.fn();
const deleteMediaAsset = vi.fn();
const revalidatePath = vi.fn();

class RedirectSignal extends Error {
  constructor(public readonly location: string) {
    super(`NEXT_REDIRECT ${location}`);
  }
}

vi.mock("@/lib/auth/session.server", () => ({
  requireAdminAuthorized: () => requireAdminAuthorized(),
  ADMIN_HOME_PATH: "/admin",
  LOGIN_PATH: "/admin/login",
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type?: string) => revalidatePath(path, type),
}));

vi.mock("next/navigation", () => ({
  redirect: (location: string) => {
    throw new RedirectSignal(location);
  },
}));

vi.mock("@/lib/repositories/media-repository.server", () => {
  class MediaAssetNotFoundError extends Error {
    constructor(public readonly slot: string) {
      super(`missing ${slot}`);
      this.name = "MediaAssetNotFoundError";
    }
  }
  return {
    MediaAssetNotFoundError,
    PROFILE_PHOTO: "profile_photo",
    RESUME: "resume",
    putMediaAsset: (...args: unknown[]) => putMediaAsset(...args),
    updateMediaMetadata: (...args: unknown[]) => updateMediaMetadata(...args),
    deleteMediaAsset: (...args: unknown[]) => deleteMediaAsset(...args),
  };
});

const ACTIONS = "@/app/admin/(dashboard)/media/actions";
const REPO = "@/lib/repositories/media-repository.server";

const EMPTY = { errors: {}, message: null, success: null };

// ---------------------------------------------------------------------------
// Fixtures — real bytes, because validation is real
// ---------------------------------------------------------------------------

function pngBytes(width = 400, height = 500): Uint8Array {
  const bytes = new Uint8Array(64);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13, false);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return bytes;
}

function pdfBytes(): Uint8Array {
  return new TextEncoder().encode(
    "%PDF-1.7\n1 0 obj\n<<>>\nendobj\nxref\ntrailer\nstartxref\n42\n%%EOF\n",
  );
}

function fileOf(bytes: Uint8Array, name: string, type: string): File {
  // `.slice()` yields a Uint8Array over a plain ArrayBuffer, which is what
  // BlobPart requires — a view over a possibly-shared buffer is not assignable.
  return new File([bytes.slice().buffer], name, { type });
}

function photoForm(
  overrides: { file?: File | null; altText?: string; caption?: string } = {},
): FormData {
  const data = new FormData();
  const file = overrides.file === undefined ? fileOf(pngBytes(), "portrait.png", "image/png") : overrides.file;
  if (file !== null) data.set("file", file);
  data.set("altText", overrides.altText ?? "Chandrapal at a desk");
  data.set("caption", overrides.caption ?? "");
  return data;
}

function resumeForm(
  overrides: { file?: File | null; title?: string; description?: string; downloadLabel?: string } = {},
): FormData {
  const data = new FormData();
  const file =
    overrides.file === undefined ? fileOf(pdfBytes(), "resume.pdf", "application/pdf") : overrides.file;
  if (file !== null) data.set("file", file);
  data.set("title", overrides.title ?? "");
  data.set("description", overrides.description ?? "");
  data.set("downloadLabel", overrides.downloadLabel ?? "");
  return data;
}

function signedIn() {
  requireAdminAuthorized.mockResolvedValue({ sub: "admin@example.com", iat: 0, exp: 0 });
}

function signedOut() {
  requireAdminAuthorized.mockRejectedValue(new RedirectSignal("/admin/login"));
}

beforeEach(() => {
  vi.clearAllMocks();
  putMediaAsset.mockResolvedValue({ slot: "profile_photo" });
  updateMediaMetadata.mockResolvedValue({ slot: "profile_photo" });
  deleteMediaAsset.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

describe("authorization", () => {
  it.each([
    ["uploadPhotoAction", () => photoForm()],
    ["updatePhotoMetadataAction", () => photoForm()],
    ["deletePhotoAction", () => new FormData()],
    ["uploadResumeAction", () => resumeForm()],
    ["updateResumeMetadataAction", () => resumeForm()],
    ["deleteResumeAction", () => new FormData()],
  ])("%s refuses an unauthenticated caller and writes nothing", async (name, makeForm) => {
    signedOut();
    const actions = await import(ACTIONS);

    await expect(actions[name](EMPTY, makeForm())).rejects.toBeInstanceOf(RedirectSignal);
    expect(putMediaAsset).not.toHaveBeenCalled();
    expect(updateMediaMetadata).not.toHaveBeenCalled();
    expect(deleteMediaAsset).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("authorizes before reading the upload, so a hostile payload is never parsed", async () => {
    signedOut();
    const { uploadPhotoAction } = await import(ACTIONS);

    const hostile = photoForm({
      file: fileOf(new Uint8Array([0x4d, 0x5a]), "../../evil.png", "image/png"),
    });
    await expect(uploadPhotoAction(EMPTY, hostile)).rejects.toBeInstanceOf(RedirectSignal);
    expect(putMediaAsset).not.toHaveBeenCalled();
  });

  it("records the session subject as the actor, never a value from the form", async () => {
    signedIn();
    const { uploadPhotoAction } = await import(ACTIONS);

    const spoofed = photoForm();
    spoofed.set("updatedBy", "someone-else@example.com");

    await expect(uploadPhotoAction(EMPTY, spoofed)).rejects.toBeInstanceOf(RedirectSignal);
    expect(putMediaAsset.mock.calls[0][4]).toBe("admin@example.com");
  });
});

// ---------------------------------------------------------------------------
// Photo
// ---------------------------------------------------------------------------

describe("uploadPhotoAction", () => {
  it("stores a valid PNG with its sniffed type and dimensions", async () => {
    signedIn();
    const { uploadPhotoAction } = await import(ACTIONS);

    await expect(uploadPhotoAction(EMPTY, photoForm())).rejects.toMatchObject({
      location: "/admin/media?saved=photo",
    });

    expect(putMediaAsset).toHaveBeenCalledTimes(1);
    const [slot, validated, , metadata] = putMediaAsset.mock.calls[0];
    expect(slot).toBe("profile_photo");
    expect(validated).toMatchObject({
      mimeType: "image/png",
      filename: "portrait.png",
      dimensions: { width: 400, height: 500 },
    });
    expect(metadata).toMatchObject({ altText: "Chandrapal at a desk" });
  });

  it("replaces an existing photo through the same single call", async () => {
    // Replacement is not a separate operation: one upsert, so the previous
    // photo is readable until the new one commits.
    signedIn();
    const { uploadPhotoAction } = await import(ACTIONS);

    await expect(
      uploadPhotoAction(EMPTY, photoForm({ file: fileOf(pngBytes(800, 1000), "new.png", "image/png") })),
    ).rejects.toBeInstanceOf(RedirectSignal);

    expect(putMediaAsset).toHaveBeenCalledTimes(1);
    expect(deleteMediaAsset).not.toHaveBeenCalled();
  });

  it("asks for a file when none was chosen", async () => {
    signedIn();
    const { uploadPhotoAction } = await import(ACTIONS);

    const state = await uploadPhotoAction(EMPTY, photoForm({ file: null }));
    expect(state.message).toContain("Choose an image");
    expect(putMediaAsset).not.toHaveBeenCalled();
  });

  it("rejects an SVG that claims to be a PNG, preserving the existing photo", async () => {
    signedIn();
    const { uploadPhotoAction } = await import(ACTIONS);

    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const state = await uploadPhotoAction(
      EMPTY,
      photoForm({ file: fileOf(svg, "portrait.png", "image/png") }),
    );

    expect(state.errors.file).toContain("not a JPEG, PNG or WebP");
    // Nothing was written, so whatever was stored before is untouched.
    expect(putMediaAsset).not.toHaveBeenCalled();
  });

  it("rejects an executable renamed to .png", async () => {
    signedIn();
    const { uploadPhotoAction } = await import(ACTIONS);

    const state = await uploadPhotoAction(
      EMPTY,
      photoForm({ file: fileOf(new Uint8Array([0x4d, 0x5a, 0x90]), "photo.png", "image/png") }),
    );

    expect(state.errors.file).toBeDefined();
    expect(putMediaAsset).not.toHaveBeenCalled();
  });

  it("rejects an image below the minimum dimensions", async () => {
    signedIn();
    const { uploadPhotoAction } = await import(ACTIONS);

    const state = await uploadPhotoAction(
      EMPTY,
      photoForm({ file: fileOf(pngBytes(10, 10), "tiny.png", "image/png") }),
    );

    expect(state.errors.file).toContain("at least");
    expect(putMediaAsset).not.toHaveBeenCalled();
  });

  it("rejects an oversized image", async () => {
    signedIn();
    const { uploadPhotoAction } = await import(ACTIONS);

    const huge = new Uint8Array(6 * 1024 * 1024);
    huge.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    const state = await uploadPhotoAction(
      EMPTY,
      photoForm({ file: fileOf(huge, "big.png", "image/png") }),
    );

    expect(state.errors.file).toContain("limit is");
    expect(putMediaAsset).not.toHaveBeenCalled();
  });

  it("strips a traversal filename down to its last component", async () => {
    signedIn();
    const { uploadPhotoAction } = await import(ACTIONS);

    await expect(
      uploadPhotoAction(
        EMPTY,
        photoForm({ file: fileOf(pngBytes(), "../../../etc/passwd.png", "image/png") }),
      ),
    ).rejects.toBeInstanceOf(RedirectSignal);

    const stored = putMediaAsset.mock.calls[0][1].filename;
    expect(stored).toBe("passwd.png");
    expect(stored).not.toContain("..");
    expect(stored).not.toContain("/");
  });

  it("requires alt text before storing anything", async () => {
    signedIn();
    const { uploadPhotoAction } = await import(ACTIONS);

    const state = await uploadPhotoAction(EMPTY, photoForm({ altText: "" }));
    expect(state.errors.altText).toBeDefined();
    expect(putMediaAsset).not.toHaveBeenCalled();
  });
});

describe("updatePhotoMetadataAction", () => {
  it("changes the text without touching the image", async () => {
    signedIn();
    const { updatePhotoMetadataAction } = await import(ACTIONS);

    await expect(
      updatePhotoMetadataAction(EMPTY, photoForm({ altText: "New description" })),
    ).rejects.toMatchObject({ location: "/admin/media?saved=photo-text" });

    expect(updateMediaMetadata).toHaveBeenCalledWith(
      "profile_photo",
      { altText: "New description", caption: "" },
      "admin@example.com",
    );
    // The blob is never rewritten by a text edit.
    expect(putMediaAsset).not.toHaveBeenCalled();
  });

  it("reports a missing asset rather than creating an empty one", async () => {
    signedIn();
    const { MediaAssetNotFoundError } = await import(REPO);
    updateMediaMetadata.mockRejectedValue(new MediaAssetNotFoundError("profile_photo"));
    const { updatePhotoMetadataAction } = await import(ACTIONS);

    const state = await updatePhotoMetadataAction(EMPTY, photoForm());
    expect(state.message).toContain("no photo to describe");
    expect(putMediaAsset).not.toHaveBeenCalled();
  });
});

describe("deletePhotoAction", () => {
  it("deletes and redirects to the confirmation", async () => {
    signedIn();
    const { deletePhotoAction } = await import(ACTIONS);

    await expect(deletePhotoAction(EMPTY, new FormData())).rejects.toMatchObject({
      location: "/admin/media?saved=photo-deleted",
    });
    expect(deleteMediaAsset).toHaveBeenCalledWith("profile_photo");
  });

  it("says so plainly when there is nothing to delete", async () => {
    signedIn();
    const { MediaAssetNotFoundError } = await import(REPO);
    deleteMediaAsset.mockRejectedValue(new MediaAssetNotFoundError("profile_photo"));
    const { deletePhotoAction } = await import(ACTIONS);

    const state = await deletePhotoAction(EMPTY, new FormData());
    expect(state.message).toContain("no photo to delete");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("never touches the resume", async () => {
    signedIn();
    const { deletePhotoAction } = await import(ACTIONS);

    await expect(deletePhotoAction(EMPTY, new FormData())).rejects.toBeInstanceOf(RedirectSignal);
    expect(deleteMediaAsset).toHaveBeenCalledTimes(1);
    expect(deleteMediaAsset.mock.calls[0][0]).toBe("profile_photo");
  });
});

// ---------------------------------------------------------------------------
// Resume
// ---------------------------------------------------------------------------

describe("uploadResumeAction", () => {
  it("stores a valid PDF", async () => {
    signedIn();
    const { uploadResumeAction } = await import(ACTIONS);

    await expect(
      uploadResumeAction(EMPTY, resumeForm({ title: "Résumé", downloadLabel: "CV" })),
    ).rejects.toMatchObject({ location: "/admin/media?saved=resume" });

    const [slot, validated, , metadata] = putMediaAsset.mock.calls[0];
    expect(slot).toBe("resume");
    expect(validated).toMatchObject({
      mimeType: "application/pdf",
      filename: "resume.pdf",
      dimensions: null,
    });
    expect(metadata).toMatchObject({ title: "Résumé", downloadLabel: "CV" });
  });

  it("replaces through the same single call, keeping the old file until it commits", async () => {
    signedIn();
    const { uploadResumeAction } = await import(ACTIONS);

    await expect(uploadResumeAction(EMPTY, resumeForm())).rejects.toBeInstanceOf(RedirectSignal);
    expect(putMediaAsset).toHaveBeenCalledTimes(1);
    expect(deleteMediaAsset).not.toHaveBeenCalled();
  });

  it("rejects an image offered as the resume", async () => {
    signedIn();
    const { uploadResumeAction } = await import(ACTIONS);

    const state = await uploadResumeAction(
      EMPTY,
      resumeForm({ file: fileOf(pngBytes(), "resume.pdf", "application/pdf") }),
    );

    expect(state.errors.file).toBeDefined();
    expect(putMediaAsset).not.toHaveBeenCalled();
  });

  it("rejects a truncated PDF, preserving the previous resume", async () => {
    signedIn();
    const { uploadResumeAction } = await import(ACTIONS);

    const full = pdfBytes();
    const state = await uploadResumeAction(
      EMPTY,
      resumeForm({
        file: fileOf(full.subarray(0, full.length - 12), "resume.pdf", "application/pdf"),
      }),
    );

    expect(state.errors.file).toContain("incomplete or damaged");
    expect(putMediaAsset).not.toHaveBeenCalled();
  });

  it("asks for a file when none was chosen", async () => {
    signedIn();
    const { uploadResumeAction } = await import(ACTIONS);

    const state = await uploadResumeAction(EMPTY, resumeForm({ file: null }));
    expect(state.message).toContain("Choose a PDF");
    expect(putMediaAsset).not.toHaveBeenCalled();
  });
});

describe("updateResumeMetadataAction", () => {
  it("maps the description onto the caption column", async () => {
    signedIn();
    const { updateResumeMetadataAction } = await import(ACTIONS);

    await expect(
      updateResumeMetadataAction(
        EMPTY,
        resumeForm({ title: "Résumé", description: "Updated 2026", downloadLabel: "CV" }),
      ),
    ).rejects.toMatchObject({ location: "/admin/media?saved=resume-text" });

    expect(updateMediaMetadata).toHaveBeenCalledWith(
      "resume",
      { title: "Résumé", caption: "Updated 2026", downloadLabel: "CV" },
      "admin@example.com",
    );
  });

  it("refuses a field over its limit without writing", async () => {
    signedIn();
    const { updateResumeMetadataAction } = await import(ACTIONS);

    const state = await updateResumeMetadataAction(
      EMPTY,
      resumeForm({ downloadLabel: "l".repeat(60) }),
    );
    expect(state.errors.downloadLabel).toBeDefined();
    expect(updateMediaMetadata).not.toHaveBeenCalled();
  });
});

describe("deleteResumeAction", () => {
  it("deletes only the resume", async () => {
    signedIn();
    const { deleteResumeAction } = await import(ACTIONS);

    await expect(deleteResumeAction(EMPTY, new FormData())).rejects.toMatchObject({
      location: "/admin/media?saved=resume-deleted",
    });
    expect(deleteMediaAsset).toHaveBeenCalledWith("resume");
  });
});

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

describe("cache invalidation", () => {
  it.each([
    ["uploadPhotoAction", () => photoForm()],
    ["uploadResumeAction", () => resumeForm()],
    ["deletePhotoAction", () => new FormData()],
    ["deleteResumeAction", () => new FormData()],
  ])("%s revalidates the whole layout tree", async (name, makeForm) => {
    // The resume link is in the site-wide navigation and the portrait is on
    // the home page, so a page-by-page list would go stale the moment a link
    // moved.
    signedIn();
    const actions = await import(ACTIONS);

    await expect(actions[name](EMPTY, makeForm())).rejects.toBeInstanceOf(RedirectSignal);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/media", undefined);
  });

  it("does not revalidate when the write was refused", async () => {
    signedIn();
    const { uploadPhotoAction } = await import(ACTIONS);

    await uploadPhotoAction(EMPTY, photoForm({ altText: "" }));
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("lets an unexpected failure propagate rather than reporting success", async () => {
    signedIn();
    putMediaAsset.mockRejectedValue(new Error("connection reset"));
    const { uploadPhotoAction } = await import(ACTIONS);

    await expect(uploadPhotoAction(EMPTY, photoForm())).rejects.toThrow("connection reset");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
