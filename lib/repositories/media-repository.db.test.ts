// Integration tests for managed media — Phase 8.
//
// Requires a live PostgreSQL instance: run with `npm run test:db`, not
// `npm test`.
//
// ── Nothing here persists ──────────────────────────────────────────────────
// Every test that writes runs inside an interactive transaction that is
// deliberately rolled back by throwing at the end. The repository's `*Within`
// functions take the transaction handle precisely so this is possible, and it
// means the suite exercises real `bytea` round trips, real unique-constraint
// behaviour and real rollbacks against the real schema while leaving
// portfolio_dev byte-for-byte unchanged. The final test asserts that directly.
//
// ── What these tests are really for ────────────────────────────────────────
// The design claim behind storing bytes beside metadata is that replacement
// and deletion are atomic and cannot orphan a file. That claim is only worth
// anything if it is demonstrated against a real transaction, which is what
// happens here — in particular, that a rolled-back replacement leaves the
// *previous bytes* readable, which a filesystem-backed design could not do.

import { beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import {
  MediaAssetNotFoundError,
  PROFILE_PHOTO,
  RESUME,
  deleteMediaAssetWithin,
  getMediaAsset,
  getMediaAssetBytes,
  listMediaAssets,
  putMediaAssetWithin,
  updateMediaMetadataWithin,
  type Tx,
} from "@/lib/repositories/media-repository.server";
import {
  createProjectWithin,
  restoreProjectRevisionWithin,
  setPublicationStatusWithin,
  updateProjectWithin,
} from "@/lib/repositories/admin-project-repository.server";
import { listProjectRevisions } from "@/lib/repositories/revision-repository.server";
import { validateUpload, type ValidatedUpload } from "@/lib/media/validate";
import type { ProjectFormValues } from "@/lib/admin/project-form";

/** Thrown to roll a transaction back once its assertions have run. */
class Rollback extends Error {
  constructor() {
    super("intentional rollback");
  }
}

async function rolledBack<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  let result: T | undefined;
  try {
    await prisma.$transaction(
      async (tx) => {
        result = await work(tx);
        throw new Rollback();
      },
      { timeout: 30_000 },
    );
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
  return result as T;
}

// ---------------------------------------------------------------------------
// Fixtures — real files, validated by the real validator
// ---------------------------------------------------------------------------

function pngBytes(width = 400, height = 500, marker = 0xaa): Uint8Array {
  const bytes = new Uint8Array(64);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13, false);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  // A distinguishing byte, so "which version is stored?" is answerable.
  bytes[60] = marker;
  return bytes;
}

function pdfBytes(marker = "A"): Uint8Array {
  return new TextEncoder().encode(
    `%PDF-1.7\n${marker}\n1 0 obj\n<<>>\nendobj\nxref\ntrailer\nstartxref\n42\n%%EOF\n`,
  );
}

/** Validate for real, so what gets stored is what the action would store. */
function validPhoto(bytes: Uint8Array, name = "portrait.png"): ValidatedUpload {
  const result = validateUpload(bytes, name, "image", "image/png");
  if (!result.ok) throw new Error(`fixture is not valid: ${result.error}`);
  return result.value;
}

function validResume(bytes: Uint8Array, name = "resume.pdf"): ValidatedUpload {
  const result = validateUpload(bytes, name, "document", "application/pdf");
  if (!result.ok) throw new Error(`fixture is not valid: ${result.error}`);
  return result.value;
}

const PROJECT_SLUG = "zz-media-integration-fixture";

function projectValues(overrides: Partial<ProjectFormValues> = {}): ProjectFormValues {
  return {
    slug: PROJECT_SLUG,
    title: "Media Integration Fixture",
    category: "supporting",
    status: "Completed",
    source: "GitHub",
    featured: false,
    shortDescription: "Created inside a transaction that is rolled back.",
    evidenceStatus: "self-reported",
    verificationNotes: "Fixture row.",
    technologies: [],
    githubUrl: null,
    demoUrl: null,
    displayOrder: 910,
    publicationStatus: "draft",
    ...overrides,
  };
}

beforeAll(() => {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. These tests need the local portfolio_dev database; run them with `npm run test:db`.",
    );
  }
});

// ---------------------------------------------------------------------------

describe("storing an asset", () => {
  it("round-trips the bytes through bytea unchanged", async () => {
    const bytes = pngBytes(400, 500, 0x5a);
    const stored = await rolledBack(async (tx) => {
      await putMediaAssetWithin(tx, PROFILE_PHOTO, validPhoto(bytes), bytes, {
        altText: "A portrait",
      });
      return getMediaAssetBytes(PROFILE_PHOTO, tx);
    });

    expect(stored).not.toBeNull();
    expect(new Uint8Array(stored!.data)).toEqual(bytes);
    expect(stored!.mimeType).toBe("image/png");
    expect(stored!.filename).toBe("portrait.png");
  });

  it("records the sniffed type, size, dimensions and actor", async () => {
    const bytes = pngBytes(800, 1000);
    const meta = await rolledBack((tx) =>
      putMediaAssetWithin(
        tx,
        PROFILE_PHOTO,
        validPhoto(bytes),
        bytes,
        { altText: "A portrait" },
        "admin@example.com",
      ),
    );

    expect(meta).toMatchObject({
      slot: "profile_photo",
      mimeType: "image/png",
      byteSize: bytes.length,
      width: 800,
      height: 1000,
      altText: "A portrait",
      updatedBy: "admin@example.com",
    });
  });

  it("stores a PDF with no dimensions", async () => {
    const bytes = pdfBytes();
    const meta = await rolledBack((tx) =>
      putMediaAssetWithin(tx, RESUME, validResume(bytes), bytes, { title: "Résumé" }),
    );

    expect(meta).toMatchObject({
      slot: "resume",
      mimeType: "application/pdf",
      width: null,
      height: null,
      title: "Résumé",
    });
  });

  it("keeps the two slots independent", async () => {
    const result = await rolledBack(async (tx) => {
      const photo = pngBytes();
      const resume = pdfBytes();
      await putMediaAssetWithin(tx, PROFILE_PHOTO, validPhoto(photo), photo, {
        altText: "A portrait",
      });
      await putMediaAssetWithin(tx, RESUME, validResume(resume), resume);

      return {
        all: await listMediaAssets(tx),
        photo: await getMediaAsset(PROFILE_PHOTO, tx),
        resume: await getMediaAsset(RESUME, tx),
      };
    });

    expect(result.all).toHaveLength(2);
    expect(result.photo!.mimeType).toBe("image/png");
    expect(result.resume!.mimeType).toBe("application/pdf");
  });

  it("holds at most one row per slot", async () => {
    // The unique index is what makes "the profile photo" a single thing.
    const count = await rolledBack(async (tx) => {
      const first = pngBytes(400, 500, 0x01);
      const second = pngBytes(600, 700, 0x02);
      await putMediaAssetWithin(tx, PROFILE_PHOTO, validPhoto(first), first, {
        altText: "First",
      });
      await putMediaAssetWithin(tx, PROFILE_PHOTO, validPhoto(second), second, {
        altText: "Second",
      });
      return tx.mediaAsset.count({ where: { slot: "profile_photo" } });
    });

    expect(count).toBe(1);
  });
});

describe("replacement", () => {
  it("swaps the bytes in one statement, with no empty intermediate state", async () => {
    const result = await rolledBack(async (tx) => {
      const original = pngBytes(400, 500, 0x11);
      await putMediaAssetWithin(tx, PROFILE_PHOTO, validPhoto(original, "old.png"), original, {
        altText: "Original",
      });

      const replacement = pngBytes(900, 1200, 0x22);
      await putMediaAssetWithin(
        tx,
        PROFILE_PHOTO,
        validPhoto(replacement, "new.png"),
        replacement,
      );

      return {
        bytes: await getMediaAssetBytes(PROFILE_PHOTO, tx),
        meta: await getMediaAsset(PROFILE_PHOTO, tx),
        rows: await tx.mediaAsset.count(),
      };
    });

    expect(new Uint8Array(result.bytes!.data)[60]).toBe(0x22);
    expect(result.meta).toMatchObject({ filename: "new.png", width: 900, height: 1200 });
    // One row throughout — nothing was deleted and re-created, so there was
    // never a moment with no photo.
    expect(result.rows).toBe(1);
  });

  it("carries existing text across a file swap instead of blanking it", async () => {
    // Replacing the image must not silently discard alt text written for it.
    const meta = await rolledBack(async (tx) => {
      const original = pngBytes();
      await putMediaAssetWithin(tx, PROFILE_PHOTO, validPhoto(original), original, {
        altText: "Carefully written description",
        caption: "A caption",
      });

      const replacement = pngBytes(600, 700, 0x33);
      // No metadata supplied — the caller is only changing the file.
      await putMediaAssetWithin(tx, PROFILE_PHOTO, validPhoto(replacement), replacement);
      return getMediaAsset(PROFILE_PHOTO, tx);
    });

    expect(meta!.altText).toBe("Carefully written description");
    expect(meta!.caption).toBe("A caption");
  });

  it("treats an explicit empty string as a real edit, not as absent", async () => {
    const meta = await rolledBack(async (tx) => {
      const bytes = pngBytes();
      await putMediaAssetWithin(tx, PROFILE_PHOTO, validPhoto(bytes), bytes, {
        altText: "Something",
        caption: "Clear me",
      });
      await putMediaAssetWithin(tx, PROFILE_PHOTO, validPhoto(bytes), bytes, {
        altText: "Something",
        caption: "",
      });
      return getMediaAsset(PROFILE_PHOTO, tx);
    });

    expect(meta!.caption).toBe("");
  });

  it("PRESERVES THE PREVIOUS ASSET when the replacement is rolled back", async () => {
    // The disconfirming test for the whole storage decision. With bytes on
    // disk and metadata in the database, the row would roll back while the
    // file stayed overwritten — the site would then serve the new image under
    // the old row's description. Here there is one row, so it cannot happen.
    //
    // A SAVEPOINT models the failed replacement exactly: the write really
    // happens, then really is undone, inside the same transaction and against
    // the same row. A nested `prisma.$transaction` would not work — it takes a
    // second connection and would block forever on the row lock this one
    // already holds.
    const observed = await rolledBack(async (tx) => {
      const original = pngBytes(400, 500, 0x77);
      await putMediaAssetWithin(tx, PROFILE_PHOTO, validPhoto(original, "original.png"), original, {
        altText: "Original",
      });

      await tx.$executeRawUnsafe("SAVEPOINT before_replace");

      const replacement = pngBytes(900, 1200, 0x88);
      await putMediaAssetWithin(
        tx,
        PROFILE_PHOTO,
        validPhoto(replacement, "replacement.png"),
        replacement,
      );

      // Confirm the replacement really was applied before it is undone —
      // otherwise this test would pass even if the write had silently no-oped.
      const mid = await getMediaAsset(PROFILE_PHOTO, tx);
      expect(mid!.filename).toBe("replacement.png");

      // The upload fails at this point.
      await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT before_replace");

      return {
        bytes: await getMediaAssetBytes(PROFILE_PHOTO, tx),
        meta: await getMediaAsset(PROFILE_PHOTO, tx),
      };
    });

    // The original bytes and the original name are both intact.
    expect(new Uint8Array(observed.bytes!.data)[60]).toBe(0x77);
    expect(observed.meta!.filename).toBe("original.png");
    expect(observed.meta!.width).toBe(400);
    expect(observed.meta!.altText).toBe("Original");
  });

  it("leaves nothing behind to clean up — there is no second store to orphan", async () => {
    const rows = await rolledBack(async (tx) => {
      for (let i = 0; i < 5; i++) {
        const bytes = pngBytes(400 + i, 500 + i, i);
        await putMediaAssetWithin(tx, PROFILE_PHOTO, validPhoto(bytes, `v${i}.png`), bytes);
      }
      return tx.mediaAsset.count({ where: { slot: "profile_photo" } });
    });

    // Five replacements, one row. No previous version lingers anywhere.
    expect(rows).toBe(1);
  });
});

describe("metadata-only edits", () => {
  it("changes the text without rewriting the bytes", async () => {
    const result = await rolledBack(async (tx) => {
      const bytes = pngBytes(400, 500, 0x99);
      await putMediaAssetWithin(tx, PROFILE_PHOTO, validPhoto(bytes), bytes, {
        altText: "Before",
      });

      await updateMediaMetadataWithin(
        tx,
        PROFILE_PHOTO,
        { altText: "After", caption: "New caption" },
        "admin@example.com",
      );

      return {
        meta: await getMediaAsset(PROFILE_PHOTO, tx),
        bytes: await getMediaAssetBytes(PROFILE_PHOTO, tx),
      };
    });

    expect(result.meta).toMatchObject({ altText: "After", caption: "New caption" });
    // The file is untouched: same size, same distinguishing byte.
    expect(new Uint8Array(result.bytes!.data)[60]).toBe(0x99);
    expect(result.meta!.byteSize).toBe(64);
  });

  it("updates the resume's title, description and label", async () => {
    const meta = await rolledBack(async (tx) => {
      const bytes = pdfBytes();
      await putMediaAssetWithin(tx, RESUME, validResume(bytes), bytes);
      await updateMediaMetadataWithin(tx, RESUME, {
        title: "Résumé",
        caption: "Updated 2026",
        downloadLabel: "CV",
      });
      return getMediaAsset(RESUME, tx);
    });

    expect(meta).toMatchObject({
      title: "Résumé",
      caption: "Updated 2026",
      downloadLabel: "CV",
    });
  });

  it("refuses to describe an asset that does not exist", async () => {
    await rolledBack(async (tx) => {
      await expect(
        updateMediaMetadataWithin(tx, RESUME, { title: "Nothing to name" }),
      ).rejects.toBeInstanceOf(MediaAssetNotFoundError);
    });
  });
});

describe("deletion", () => {
  it("removes the row and its bytes together", async () => {
    const after = await rolledBack(async (tx) => {
      const bytes = pngBytes();
      await putMediaAssetWithin(tx, PROFILE_PHOTO, validPhoto(bytes), bytes);
      await deleteMediaAssetWithin(tx, PROFILE_PHOTO);
      return {
        meta: await getMediaAsset(PROFILE_PHOTO, tx),
        bytes: await getMediaAssetBytes(PROFILE_PHOTO, tx),
      };
    });

    // Null, not an empty row: the fallback is a designed state.
    expect(after.meta).toBeNull();
    expect(after.bytes).toBeNull();
  });

  it("deletes only the named slot", async () => {
    const after = await rolledBack(async (tx) => {
      const photo = pngBytes();
      const resume = pdfBytes();
      await putMediaAssetWithin(tx, PROFILE_PHOTO, validPhoto(photo), photo);
      await putMediaAssetWithin(tx, RESUME, validResume(resume), resume);

      await deleteMediaAssetWithin(tx, PROFILE_PHOTO);
      return {
        photo: await getMediaAsset(PROFILE_PHOTO, tx),
        resume: await getMediaAsset(RESUME, tx),
      };
    });

    expect(after.photo).toBeNull();
    expect(after.resume).not.toBeNull();
  });

  it("refuses to delete an empty slot rather than silently succeeding", async () => {
    await rolledBack(async (tx) => {
      await expect(deleteMediaAssetWithin(tx, RESUME)).rejects.toBeInstanceOf(
        MediaAssetNotFoundError,
      );
    });
  });

  it("restores the asset when the deleting transaction rolls back", async () => {
    const before = await prisma.mediaAsset.count();

    await rolledBack(async (tx) => {
      const bytes = pngBytes();
      await putMediaAssetWithin(tx, PROFILE_PHOTO, validPhoto(bytes), bytes);
      await deleteMediaAssetWithin(tx, PROFILE_PHOTO);
      expect(await getMediaAsset(PROFILE_PHOTO, tx)).toBeNull();
    });

    expect(await prisma.mediaAsset.count()).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Isolation from project content
// ---------------------------------------------------------------------------

describe("media and project content do not touch each other", () => {
  it("a project revision restore leaves media completely alone", async () => {
    // The requirement stated plainly: restoring a project must not overwrite
    // or delete the portrait or the resume. It holds structurally —
    // updateProjectWithin writes `projects` and `project_technologies` and
    // nothing else — and this is the test that would notice if it stopped.
    const result = await rolledBack(async (tx) => {
      const photo = pngBytes(400, 500, 0x44);
      const resume = pdfBytes("KEEP");
      await putMediaAssetWithin(tx, PROFILE_PHOTO, validPhoto(photo, "keep.png"), photo, {
        altText: "Must survive a restore",
      });
      await putMediaAssetWithin(tx, RESUME, validResume(resume, "keep.pdf"), resume, {
        title: "Must also survive",
      });

      const created = await createProjectWithin(tx, projectValues({ title: "One" }));
      await updateProjectWithin(tx, PROJECT_SLUG, projectValues({ title: "Two" }));

      const v1 = (await listProjectRevisions(created.id, tx)).find((r) => r.versionNumber === 1)!;
      await restoreProjectRevisionWithin(tx, PROJECT_SLUG, v1.id);

      return {
        project: await tx.project.findUniqueOrThrow({ where: { slug: PROJECT_SLUG } }),
        photoMeta: await getMediaAsset(PROFILE_PHOTO, tx),
        photoBytes: await getMediaAssetBytes(PROFILE_PHOTO, tx),
        resumeMeta: await getMediaAsset(RESUME, tx),
        assetCount: await tx.mediaAsset.count(),
      };
    });

    // The restore did happen...
    expect(result.project.title).toBe("One");
    // ...and the media is exactly as it was.
    expect(result.assetCount).toBe(2);
    expect(result.photoMeta).toMatchObject({
      filename: "keep.png",
      altText: "Must survive a restore",
    });
    expect(new Uint8Array(result.photoBytes!.data)[60]).toBe(0x44);
    expect(result.resumeMeta).toMatchObject({ filename: "keep.pdf", title: "Must also survive" });
  });

  it("publishing a project does not touch media", async () => {
    const result = await rolledBack(async (tx) => {
      const photo = pngBytes();
      await putMediaAssetWithin(tx, PROFILE_PHOTO, validPhoto(photo), photo, {
        altText: "Unrelated",
      });
      const before = await getMediaAsset(PROFILE_PHOTO, tx);

      await createProjectWithin(tx, projectValues());
      await setPublicationStatusWithin(tx, PROJECT_SLUG, "published");

      return { before, after: await getMediaAsset(PROFILE_PHOTO, tx) };
    });

    expect(result.after).toEqual(result.before);
  });

  it("replacing media does not change any project's publication status", async () => {
    // The mirror requirement: managing an asset must not publish anything.
    const result = await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, projectValues({ publicationStatus: "draft" }));

      const photo = pngBytes();
      await putMediaAssetWithin(tx, PROFILE_PHOTO, validPhoto(photo), photo, { altText: "x" });
      const replacement = pngBytes(600, 700, 0x66);
      await putMediaAssetWithin(tx, PROFILE_PHOTO, validPhoto(replacement), replacement);
      await deleteMediaAssetWithin(tx, PROFILE_PHOTO);

      return {
        project: await tx.project.findUniqueOrThrow({ where: { id: created.id } }),
        revisions: await listProjectRevisions(created.id, tx),
      };
    });

    expect(result.project.publicationStatus).toBe("draft");
    // And no revision was recorded for the project by any media operation.
    expect(result.revisions).toHaveLength(1);
  });

  it("media changes record their own actor without creating project revisions", async () => {
    // Media is not versioned in `content_revisions`: that table holds project
    // snapshots. Who changed an asset and when is recorded on the asset row
    // itself (`updated_by`, `updated_at`), which is what the requirement asks
    // for without inventing a second history model.
    const result = await rolledBack(async (tx) => {
      const before = await tx.contentRevision.count();
      const bytes = pngBytes();
      const meta = await putMediaAssetWithin(
        tx,
        PROFILE_PHOTO,
        validPhoto(bytes),
        bytes,
        { altText: "x" },
        "admin@example.com",
      );
      return { meta, added: (await tx.contentRevision.count()) - before };
    });

    expect(result.meta.updatedBy).toBe("admin@example.com");
    expect(result.meta.updatedAt).toBeInstanceOf(Date);
    expect(result.added).toBe(0);
  });

  it("never writes to Cortex Lab", async () => {
    const cortex = await rolledBack(async (tx) => {
      const bytes = pngBytes();
      await putMediaAssetWithin(tx, PROFILE_PHOTO, validPhoto(bytes), bytes, { altText: "x" });
      return tx.project.findUniqueOrThrow({ where: { slug: "cortex-lab" } });
    });

    expect(cortex.updatedAt).toEqual(new Date("2026-09-12T05:40:34.450Z"));
  });
});

describe("the real database is untouched by media so far", () => {
  it("holds no managed assets", async () => {
    // Nothing has been uploaded through the admin, so the table is empty —
    // and every test above rolled back.
    expect(await prisma.mediaAsset.count()).toBe(0);
  });

  it("still holds exactly the 13 imported projects", async () => {
    expect(await prisma.project.count()).toBe(13);
    expect(await prisma.project.count({ where: { slug: { startsWith: "zz-" } } })).toBe(0);
  });
});
