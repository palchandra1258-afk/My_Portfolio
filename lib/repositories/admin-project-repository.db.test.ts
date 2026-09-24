// Integration tests for the CMS write path — Phase 7.
//
// Requires a live PostgreSQL instance: run with `npm run test:db`, not
// `npm test`.
//
// ── Nothing here persists ──────────────────────────────────────────────────
// Every test that writes runs inside an interactive transaction which is
// deliberately rolled back by throwing at the end. The repository's `*Within`
// functions take the transaction handle precisely so this is possible, and it
// means the suite can exercise real inserts, real unique-constraint
// violations and real child-row synchronisation against the real schema while
// leaving portfolio_dev byte-for-byte unchanged. The final test asserts that
// property directly.
//
// Consequence worth knowing: `createProject`/`updateProject` (the non-`Within`
// wrappers that open their own transaction) are NOT exercised here, because
// they would commit. They are three-line wrappers over the functions that are.
//
// Cortex Lab is never read into an assertion that could pressure a change, and
// never written — not even inside a rolled-back transaction.

import { beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import {
  DuplicateSlugError,
  InvalidRevisionError,
  ProjectNotFoundError,
  RevisionNotFoundError,
  createProjectWithin,
  getProjectForEdit,
  listProjectsForAdmin,
  nextDisplayOrder,
  restoreProjectRevisionWithin,
  setPublicationStatusWithin,
  updateProjectWithin,
  type Tx,
} from "@/lib/repositories/admin-project-repository.server";
import { getAllProjects as readPublicProjects } from "@/lib/repositories/project-repository.server";
import {
  getProjectRevision,
  listProjectRevisions,
} from "@/lib/repositories/revision-repository.server";
import { readProjectsFromDatabase } from "@/lib/repositories/read-model";
import { compareSnapshots } from "@/lib/admin/revision-diff";
import {
  EVIDENCE_STATUSES,
  PROJECT_CATEGORIES,
  PROJECT_SOURCES,
  PROJECT_STATUSES,
  PUBLICATION_STATUSES,
  type ProjectFormValues,
} from "@/lib/admin/project-form";

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
      // Generous: these do a dozen round-trips and the default is 5s.
      { timeout: 30_000 },
    );
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
  return result as T;
}

const TEST_SLUG = "zz-cms-integration-fixture";

function values(overrides: Partial<ProjectFormValues> = {}): ProjectFormValues {
  return {
    slug: TEST_SLUG,
    title: "CMS Integration Fixture",
    category: "supporting",
    status: "Completed",
    source: "GitHub",
    featured: false,
    shortDescription: "Created inside a transaction that is rolled back.",
    evidenceStatus: "self-reported",
    verificationNotes: "Fixture row. [NEEDS VERIFICATION] retained on purpose.",
    technologies: [],
    githubUrl: null,
    demoUrl: null,
    displayOrder: 900,
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

describe("createProjectWithin", () => {
  it("creates a project with the submitted values", async () => {
    const row = await rolledBack(async (tx) => {
      await createProjectWithin(tx, values({ title: "Created In Test" }));
      return tx.project.findUnique({ where: { slug: TEST_SLUG } });
    });

    expect(row).not.toBeNull();
    expect(row!.title).toBe("Created In Test");
    expect(row!.publicationStatus).toBe("draft");
  });

  it("marks the row CMS-authored, which is what protects it from db:import", async () => {
    const row = await rolledBack(async (tx) => {
      await createProjectWithin(tx, values());
      return tx.project.findUnique({ where: { slug: TEST_SLUG } });
    });
    expect(row!.contentOrigin).toBe("cms");
  });

  it("stamps published_at when created as published, and leaves it null for a draft", async () => {
    const [draft, published] = await rolledBack(async (tx) => {
      await createProjectWithin(tx, values({ publicationStatus: "draft" }));
      const d = await tx.project.findUnique({ where: { slug: TEST_SLUG } });
      await createProjectWithin(
        tx,
        values({ slug: `${TEST_SLUG}-2`, publicationStatus: "published" }),
      );
      const p = await tx.project.findUnique({ where: { slug: `${TEST_SLUG}-2` } });
      return [d, p];
    });

    expect(draft!.publishedAt).toBeNull();
    expect(published!.publishedAt).toBeInstanceOf(Date);
  });

  it("links technologies, reusing existing rows rather than duplicating them", async () => {
    const result = await rolledBack(async (tx) => {
      // "TypeScript" already exists in the technology registry; the second
      // name is new. Both must end up as exactly one row each.
      await createProjectWithin(tx, values({ technologies: ["TypeScript", "ZZ Fixture Tech"] }));
      const project = await tx.project.findUnique({
        where: { slug: TEST_SLUG },
        include: {
          technologies: {
            orderBy: { displayOrder: "asc" },
            include: { technology: { select: { name: true } } },
          },
        },
      });
      return {
        names: project!.technologies.map((t) => t.technology.name),
        typescriptRows: await tx.technology.count({ where: { name: "TypeScript" } }),
      };
    });

    expect(result.names).toEqual(["TypeScript", "ZZ Fixture Tech"]);
    expect(result.typescriptRows).toBe(1);
  });

  it("rejects a duplicate slug with a typed error", async () => {
    const error = await rolledBack(async (tx) => {
      // "the-inevitable" is a real, existing project.
      return createProjectWithin(tx, values({ slug: "the-inevitable" })).catch((e: unknown) => e);
    });

    expect(error).toBeInstanceOf(DuplicateSlugError);
    expect((error as DuplicateSlugError).slug).toBe("the-inevitable");
  });
});

describe("updateProjectWithin", () => {
  it("updates the scalar fields it owns", async () => {
    const row = await rolledBack(async (tx) => {
      await createProjectWithin(tx, values());
      await updateProjectWithin(
        tx,
        TEST_SLUG,
        values({ title: "Renamed", featured: true, publicationStatus: "published" }),
      );
      return tx.project.findUnique({ where: { slug: TEST_SLUG } });
    });

    expect(row!.title).toBe("Renamed");
    expect(row!.featured).toBe(true);
    expect(row!.publicationStatus).toBe("published");
  });

  it("keeps published_at when a published project is later unpublished", async () => {
    // §46: unpublishing removes a project from the site without destroying the
    // record of when it went live.
    const row = await rolledBack(async (tx) => {
      await createProjectWithin(tx, values({ publicationStatus: "published" }));
      const first = await tx.project.findUnique({ where: { slug: TEST_SLUG } });
      await updateProjectWithin(tx, TEST_SLUG, values({ publicationStatus: "draft" }));
      const after = await tx.project.findUnique({ where: { slug: TEST_SLUG } });
      return { first: first!.publishedAt, after: after!.publishedAt };
    });

    expect(row.first).toBeInstanceOf(Date);
    expect(row.after).toEqual(row.first);
  });

  it("synchronises technology links, adding and removing only join rows", async () => {
    const result = await rolledBack(async (tx) => {
      await createProjectWithin(tx, values({ technologies: ["Python", "ZZ Fixture A"] }));
      await updateProjectWithin(
        tx,
        TEST_SLUG,
        values({ technologies: ["ZZ Fixture A", "ZZ Fixture B"] }),
      );
      const project = await tx.project.findUnique({
        where: { slug: TEST_SLUG },
        include: {
          technologies: {
            orderBy: { displayOrder: "asc" },
            include: { technology: { select: { name: true } } },
          },
        },
      });
      return {
        names: project!.technologies.map((t) => t.technology.name),
        // The lookup row for a technology that was unlinked must survive —
        // other projects may still reference it.
        pythonStillExists: (await tx.technology.count({ where: { name: "Python" } })) === 1,
      };
    });

    expect(result.names).toEqual(["ZZ Fixture A", "ZZ Fixture B"]);
    expect(result.pythonStillExists).toBe(true);
  });

  it("rejects a rename onto another project's slug", async () => {
    const error = await rolledBack(async (tx) => {
      await createProjectWithin(tx, values());
      return updateProjectWithin(tx, TEST_SLUG, values({ slug: "the-inevitable" })).catch(
        (e: unknown) => e,
      );
    });

    expect(error).toBeInstanceOf(DuplicateSlugError);
  });

  it("rejects an update to a slug that does not exist", async () => {
    const error = await rolledBack(async (tx) =>
      updateProjectWithin(tx, "no-such-project-anywhere", values()).catch((e: unknown) => e),
    );

    expect(error).toBeInstanceOf(ProjectNotFoundError);
  });
});

describe("what an edit must NOT destroy", () => {
  it("leaves metrics, list items, notes, alternate names and relationships untouched", async () => {
    // The central safety property of this phase. The Phase 7 form collects
    // none of these, and scripts/db/import.ts replaces all of them wholesale —
    // so if updateProjectWithin behaved like the importer, the first save from
    // the admin UI would wipe the evidence-graded content of a real project.
    const result = await rolledBack(async (tx) => {
      const project = await tx.project.create({
        data: {
          slug: TEST_SLUG,
          title: "Fixture With Children",
          shortDescription: "x",
          category: "supporting",
          status: "Completed",
          evidenceStatus: "self_reported",
          verificationNotes: "x",
          featured: false,
          source: "GitHub",
          displayOrder: 901,
          publicationStatus: "draft",
          metrics: {
            create: [
              { label: "Accuracy", value: "[NEEDS VERIFICATION]", kind: "needs_verification", displayOrder: 0 },
            ],
          },
          contentListItems: {
            create: [{ listType: "results", body: "A result.", displayOrder: 0 }],
          },
          implementationNotes: {
            create: [{ label: "Retrieval", status: "specified", displayOrder: 0 }],
          },
          alternateNames: { create: [{ name: "Alt Name", displayOrder: 0 }] },
        },
        select: { id: true },
      });

      await tx.projectRelationship.create({
        data: {
          sourceProjectId: project.id,
          relatedProjectId: (await tx.project.findUniqueOrThrow({
            where: { slug: "the-inevitable" },
            select: { id: true },
          })).id,
          note: "Fixture relationship.",
          displayOrder: 0,
        },
      });

      await updateProjectWithin(tx, TEST_SLUG, values({ title: "Edited Title" }));

      return {
        title: (await tx.project.findUniqueOrThrow({ where: { slug: TEST_SLUG } })).title,
        metrics: await tx.projectMetric.count({ where: { projectId: project.id } }),
        listItems: await tx.projectContentListItem.count({ where: { projectId: project.id } }),
        notes: await tx.projectImplementationNote.count({ where: { projectId: project.id } }),
        alternateNames: await tx.projectAlternateName.count({ where: { projectId: project.id } }),
        relationships: await tx.projectRelationship.count({
          where: { sourceProjectId: project.id },
        }),
        metricValue: (
          await tx.projectMetric.findFirstOrThrow({ where: { projectId: project.id } })
        ).value,
      };
    });

    expect(result.title).toBe("Edited Title");
    expect(result.metrics).toBe(1);
    expect(result.listItems).toBe(1);
    expect(result.notes).toBe(1);
    expect(result.alternateNames).toBe(1);
    expect(result.relationships).toBe(1);
    // The evidence marker survives an unrelated edit verbatim.
    expect(result.metricValue).toBe("[NEEDS VERIFICATION]");
  });

  it("does not alter any other project", async () => {
    const result = await rolledBack(async (tx) => {
      const before = await tx.project.findMany({
        orderBy: { slug: "asc" },
        select: { slug: true, title: true, updatedAt: true, displayOrder: true },
      });

      await createProjectWithin(tx, values({ technologies: ["ZZ Fixture C"] }));

      const after = await tx.project.findMany({
        where: { slug: { not: TEST_SLUG } },
        orderBy: { slug: "asc" },
        select: { slug: true, title: true, updatedAt: true, displayOrder: true },
      });
      return { before, after };
    });

    expect(result.after).toEqual(result.before);
  });
});

describe("internal verification notes", () => {
  it("loads the stored notes into the admin editor", async () => {
    // The admin is the only place they are readable at all.
    const editable = await getProjectForEdit("the-inevitable");
    expect(editable).not.toBeNull();
    expect(typeof editable!.values.verificationNotes).toBe("string");
    expect(editable!.values.verificationNotes.length).toBeGreaterThan(0);
  });

  it("adds notes to a project that had none", async () => {
    const stored = await rolledBack(async (tx) => {
      await createProjectWithin(tx, values({ verificationNotes: "" }));
      await updateProjectWithin(
        tx,
        TEST_SLUG,
        values({ verificationNotes: "Repo located. Throughput [NEEDS VERIFICATION]." }),
      );
      return (await tx.project.findUniqueOrThrow({ where: { slug: TEST_SLUG } }))
        .verificationNotes;
    });

    expect(stored).toBe("Repo located. Throughput [NEEDS VERIFICATION].");
  });

  it("edits existing notes", async () => {
    const stored = await rolledBack(async (tx) => {
      await createProjectWithin(tx, values({ verificationNotes: "First version." }));
      await updateProjectWithin(tx, TEST_SLUG, values({ verificationNotes: "Second version." }));
      return (await tx.project.findUniqueOrThrow({ where: { slug: TEST_SLUG } }))
        .verificationNotes;
    });

    expect(stored).toBe("Second version.");
  });

  it("clears notes when an empty value is saved", async () => {
    // The column is NOT NULL, so "cleared" is the empty string rather than
    // NULL — no migration needed, and nothing else has to special-case it.
    const stored = await rolledBack(async (tx) => {
      await createProjectWithin(tx, values({ verificationNotes: "Something to remove." }));
      await updateProjectWithin(tx, TEST_SLUG, values({ verificationNotes: "" }));
      return (await tx.project.findUniqueOrThrow({ where: { slug: TEST_SLUG } }))
        .verificationNotes;
    });

    expect(stored).toBe("");
  });

  it("round-trips a cleared value back through the editor as empty", async () => {
    const loaded = await rolledBack(async (tx) => {
      await createProjectWithin(tx, values({ verificationNotes: "" }));
      return getProjectForEdit(TEST_SLUG, tx);
    });

    expect(loaded!.values.verificationNotes).toBe("");
  });

  it("changes nothing else about the project when only the notes change", async () => {
    const result = await rolledBack(async (tx) => {
      await createProjectWithin(tx, values({ verificationNotes: "Before." }));
      const before = await tx.project.findUniqueOrThrow({ where: { slug: TEST_SLUG } });
      await updateProjectWithin(tx, TEST_SLUG, values({ verificationNotes: "After." }));
      const after = await tx.project.findUniqueOrThrow({ where: { slug: TEST_SLUG } });
      return { before, after };
    });

    expect(result.after.verificationNotes).toBe("After.");
    expect(result.after.title).toBe(result.before.title);
    expect(result.after.slug).toBe(result.before.slug);
    expect(result.after.shortDescription).toBe(result.before.shortDescription);
    expect(result.after.evidenceStatus).toBe(result.before.evidenceStatus);
    expect(result.after.category).toBe(result.before.category);
    expect(result.after.displayOrder).toBe(result.before.displayOrder);
    expect(result.after.publicationStatus).toBe(result.before.publicationStatus);
  });

  it("leaves other projects' notes untouched", async () => {
    const result = await rolledBack(async (tx) => {
      const before = await tx.project.findMany({
        where: { slug: { not: TEST_SLUG } },
        orderBy: { slug: "asc" },
        select: { slug: true, verificationNotes: true },
      });
      await createProjectWithin(tx, values({ verificationNotes: "Only mine." }));
      await updateProjectWithin(tx, TEST_SLUG, values({ verificationNotes: "" }));
      const after = await tx.project.findMany({
        where: { slug: { not: TEST_SLUG } },
        orderBy: { slug: "asc" },
        select: { slug: true, verificationNotes: true },
      });
      return { before, after };
    });

    expect(result.after).toEqual(result.before);
  });

  it("is absent from the public read path even though the row holds it", async () => {
    // The database keeps the notes; the public projection does not carry them.
    const publicRows = await readPublicProjects();
    expect(publicRows.length).toBe(13);
    for (const row of publicRows) {
      expect("verificationNotes" in row, row.slug).toBe(false);
    }

    const serialized = JSON.stringify(publicRows);
    const stored = await prisma.project.findMany({ select: { verificationNotes: true } });
    for (const { verificationNotes } of stored) {
      const notes = verificationNotes.trim();
      if (notes.length === 0) continue;
      expect(serialized).not.toContain(notes.slice(0, 60));
    }
  });
});

describe("draft visibility", () => {
  it("shows a draft to the admin and hides it from the public read path", async () => {
    const result = await rolledBack(async (tx) => {
      await createProjectWithin(tx, values({ publicationStatus: "draft" }));
      const adminRows = await listProjectsForAdmin(tx);
      // The public reader takes a PrismaClient; the transaction handle is
      // structurally compatible for this read.
      const publicRows = await readProjectsFromDatabase(tx as never, {
        publicationStatus: "published",
      });
      return {
        adminHas: adminRows.some((r) => r.slug === TEST_SLUG),
        publicHas: publicRows.some((p) => p.slug === TEST_SLUG),
        publicCount: publicRows.length,
      };
    });

    expect(result.adminHas).toBe(true);
    expect(result.publicHas).toBe(false);
    // The 13 real projects are all published and still visible.
    expect(result.publicCount).toBe(13);
  });
});

describe("reads", () => {
  it("returns a project in the shape the edit form expects", async () => {
    const editable = await getProjectForEdit("the-inevitable");
    expect(editable).not.toBeNull();
    expect(editable!.values.slug).toBe("the-inevitable");
    expect(editable!.values.title.length).toBeGreaterThan(0);
    expect(editable!.contentOrigin).toBe("typescript_import");
  });

  it("returns null for an unknown slug rather than throwing", async () => {
    expect(await getProjectForEdit("definitely-not-a-project")).toBeNull();
  });

  it("returns enum values the editor actually offers, for every real project", async () => {
    // Regression test for a real defect. Prisma returns the client-side enum
    // member (`self_reported`, `coming_soon`, `ActiveDevelopment`), not the
    // @map-ed database spelling. The form's <select> options come from the
    // TypeScript unions, so an untranslated value matches no option — the
    // browser silently selects the first one, and the next save rewrites the
    // project's category or evidence status to something nobody chose.
    // Checked across all 13 so a rarely-used enum member cannot slip through.
    const slugs = (await prisma.project.findMany({ select: { slug: true } })).map((r) => r.slug);
    expect(slugs.length).toBe(13);

    for (const slug of slugs) {
      const editable = await getProjectForEdit(slug);
      expect(editable, slug).not.toBeNull();
      expect(PROJECT_CATEGORIES, `${slug} category`).toContain(editable!.values.category);
      expect(PROJECT_STATUSES, `${slug} status`).toContain(editable!.values.status);
      expect(PROJECT_SOURCES, `${slug} source`).toContain(editable!.values.source);
      expect(PUBLICATION_STATUSES, `${slug} publication`).toContain(
        editable!.values.publicationStatus,
      );
    }
  });

  it("round-trips a project's own evidence status back into the form unchanged", async () => {
    // Every value the database holds must be one the editor can re-select.
    // `in-development` and `planned` are retained in the vocabulary but no
    // project uses them, which is why EVIDENCE_STATUSES omits them.
    const slugs = (await prisma.project.findMany({ select: { slug: true } })).map((r) => r.slug);
    for (const slug of slugs) {
      const editable = await getProjectForEdit(slug);
      expect(EVIDENCE_STATUSES, `${slug} evidence status`).toContain(
        editable!.values.evidenceStatus,
      );
    }
  });

  it("puts a new project at the end of the display order", async () => {
    const next = await nextDisplayOrder();
    const rows = await prisma.project.findMany({ select: { displayOrder: true } });
    expect(next).toBeGreaterThan(Math.max(...rows.map((r) => r.displayOrder)));
  });
});

describe("db:import protection for CMS-authored rows", () => {
  it("detects a CMS-authored project and names it in the refusal", async () => {
    // The mechanism that stops `npm run db:import` silently destroying every
    // edit made through the admin UI. Without it, the next routine sync would
    // rewrite the row from content/*.ts with no copy of the CMS version
    // anywhere. Exercised through planImport, which is read-only and shares
    // the detection query with the write path's refusal.
    const { cmsOverwriteRefusal, planImport } = await import("@/scripts/db/import");
    const { normalize } = await import("@/scripts/db/normalize");

    const plan = await rolledBack(async (tx) => {
      // Never cortex-lab.
      await tx.project.update({
        where: { slug: "edgememory" },
        data: { contentOrigin: "cms" },
      });
      return planImport(tx as never, normalize(), { projectSlugs: ["edgememory"] });
    });

    expect(plan.cmsAuthored).toEqual(["edgememory"]);

    const message = cmsOverwriteRefusal(plan.cmsAuthored);
    expect(message).toContain("edgememory");
    expect(message).toContain("--overwrite-cms");
  });

  it("reports nothing to protect while every row is TypeScript-authored", async () => {
    const { planImport } = await import("@/scripts/db/import");
    const { normalize } = await import("@/scripts/db/normalize");

    const plan = await planImport(prisma, normalize(), { projectSlugs: ["edgememory"] });
    expect(plan.cmsAuthored).toEqual([]);
  });
});

describe("transaction safety", () => {
  it("leaves no trace when a transaction is rolled back", async () => {
    // This is also the guarantee that makes the rest of this file safe to run
    // against the real portfolio_dev database.
    await rolledBack(async (tx) => {
      await createProjectWithin(tx, values({ technologies: ["ZZ Fixture Rollback"] }));
      expect(await tx.project.count({ where: { slug: TEST_SLUG } })).toBe(1);
    });

    expect(await prisma.project.count({ where: { slug: TEST_SLUG } })).toBe(0);
    expect(await prisma.technology.count({ where: { name: "ZZ Fixture Rollback" } })).toBe(0);
  });

  it("still holds the original 13 projects, all TypeScript-authored", async () => {
    expect(await prisma.project.count()).toBe(13);
    expect(await prisma.project.count({ where: { contentOrigin: "cms" } })).toBe(0);
  });
});

describe("publish and unpublish", () => {
  it("publishes a draft and stamps published_at", async () => {
    const result = await rolledBack(async (tx) => {
      await createProjectWithin(tx, values({ publicationStatus: "draft" }));
      const change = await setPublicationStatusWithin(tx, TEST_SLUG, "published");
      const row = await tx.project.findUniqueOrThrow({ where: { slug: TEST_SLUG } });
      return { change, row };
    });

    expect(result.row.publicationStatus).toBe("published");
    expect(result.row.publishedAt).toBeInstanceOf(Date);
    expect(result.change.firstPublish).toBe(true);
  });

  it("unpublishes to draft and keeps published_at", async () => {
    // CMS_SPECIFICATION.md 46: content stays recoverable, and when it first
    // went live is part of that record.
    const result = await rolledBack(async (tx) => {
      await createProjectWithin(tx, values({ publicationStatus: "published" }));
      const first = await tx.project.findUniqueOrThrow({ where: { slug: TEST_SLUG } });
      await setPublicationStatusWithin(tx, TEST_SLUG, "draft");
      const after = await tx.project.findUniqueOrThrow({ where: { slug: TEST_SLUG } });
      return { first, after };
    });

    expect(result.after.publicationStatus).toBe("draft");
    expect(result.after.publishedAt).toEqual(result.first.publishedAt);
    expect(result.after.publishedAt).not.toBeNull();
  });

  it("keeps the original published_at when a project is republished", async () => {
    const result = await rolledBack(async (tx) => {
      await createProjectWithin(tx, values({ publicationStatus: "published" }));
      const first = await tx.project.findUniqueOrThrow({ where: { slug: TEST_SLUG } });
      await setPublicationStatusWithin(tx, TEST_SLUG, "draft");
      const change = await setPublicationStatusWithin(tx, TEST_SLUG, "published");
      return { first: first.publishedAt, change };
    });

    expect(result.change.publishedAt).toEqual(result.first);
    expect(result.change.firstPublish).toBe(false);
  });

  it("changes nothing about the project except its publication state", async () => {
    // Going live must not be a content edit.
    const result = await rolledBack(async (tx) => {
      await createProjectWithin(
        tx,
        values({
          publicationStatus: "draft",
          technologies: ["ZZ Fixture P"],
          verificationNotes: "Internal note kept. [NEEDS VERIFICATION]",
        }),
      );
      const before = await tx.project.findUniqueOrThrow({ where: { slug: TEST_SLUG } });
      const techBefore = await tx.projectTechnology.count({ where: { projectId: before.id } });

      await setPublicationStatusWithin(tx, TEST_SLUG, "published");

      const after = await tx.project.findUniqueOrThrow({ where: { slug: TEST_SLUG } });
      const techAfter = await tx.projectTechnology.count({ where: { projectId: after.id } });
      return { before, after, techBefore, techAfter };
    });

    expect(result.after.title).toBe(result.before.title);
    expect(result.after.slug).toBe(result.before.slug);
    expect(result.after.shortDescription).toBe(result.before.shortDescription);
    expect(result.after.evidenceStatus).toBe(result.before.evidenceStatus);
    expect(result.after.category).toBe(result.before.category);
    expect(result.after.featured).toBe(result.before.featured);
    expect(result.after.displayOrder).toBe(result.before.displayOrder);
    // Admin-only field untouched, marker intact.
    expect(result.after.verificationNotes).toBe(result.before.verificationNotes);
    expect(result.after.verificationNotes).toContain("[NEEDS VERIFICATION]");
    expect(result.techAfter).toBe(result.techBefore);
  });

  it("preserves every child record", async () => {
    const result = await rolledBack(async (tx) => {
      const created = await tx.project.create({
        data: {
          slug: TEST_SLUG,
          title: "Publishable Fixture",
          shortDescription: "x",
          category: "supporting",
          status: "Completed",
          evidenceStatus: "self_reported",
          verificationNotes: "x",
          featured: false,
          source: "GitHub",
          displayOrder: 902,
          publicationStatus: "draft",
          metrics: {
            create: [
              {
                label: "Accuracy",
                value: "[NEEDS VERIFICATION]",
                kind: "needs_verification",
                displayOrder: 0,
              },
            ],
          },
          contentListItems: {
            create: [{ listType: "results", body: "A result.", displayOrder: 0 }],
          },
          alternateNames: { create: [{ name: "Alt", displayOrder: 0 }] },
        },
        select: { id: true },
      });

      await setPublicationStatusWithin(tx, TEST_SLUG, "published");

      return {
        metrics: await tx.projectMetric.count({ where: { projectId: created.id } }),
        listItems: await tx.projectContentListItem.count({ where: { projectId: created.id } }),
        alternateNames: await tx.projectAlternateName.count({ where: { projectId: created.id } }),
        metricValue: (await tx.projectMetric.findFirstOrThrow({ where: { projectId: created.id } }))
          .value,
      };
    });

    expect(result.metrics).toBe(1);
    expect(result.listItems).toBe(1);
    expect(result.alternateNames).toBe(1);
    expect(result.metricValue).toBe("[NEEDS VERIFICATION]");
  });

  it("marks the row CMS-authored so db:import cannot silently republish it", async () => {
    // The real hazard this closes: db:import writes publicationStatus
    // "published" for every row it touches. Unpublishing a project that came
    // from content/projects.ts would otherwise be undone by the next routine
    // sync, with no warning at all.
    const origin = await rolledBack(async (tx) => {
      await tx.project.update({
        where: { slug: "edgememory" },
        data: { contentOrigin: "typescript_import" },
      });
      await setPublicationStatusWithin(tx, "edgememory", "draft");
      return (await tx.project.findUniqueOrThrow({ where: { slug: "edgememory" } })).contentOrigin;
    });

    expect(origin).toBe("cms");
  });

  it("changes only the named project", async () => {
    const result = await rolledBack(async (tx) => {
      const before = await tx.project.findMany({
        where: { slug: { not: "edgememory" } },
        orderBy: { slug: "asc" },
        select: { slug: true, publicationStatus: true, publishedAt: true, updatedAt: true },
      });
      await setPublicationStatusWithin(tx, "edgememory", "draft");
      const after = await tx.project.findMany({
        where: { slug: { not: "edgememory" } },
        orderBy: { slug: "asc" },
        select: { slug: true, publicationStatus: true, publishedAt: true, updatedAt: true },
      });
      return { before, after };
    });

    expect(result.after).toEqual(result.before);
  });

  it("leaves Cortex Lab untouched when another project is unpublished", async () => {
    const result = await rolledBack(async (tx) => {
      const before = await tx.project.findUniqueOrThrow({ where: { slug: "cortex-lab" } });
      await setPublicationStatusWithin(tx, "edgememory", "draft");
      const after = await tx.project.findUniqueOrThrow({ where: { slug: "cortex-lab" } });
      return { before, after };
    });

    expect(result.after).toEqual(result.before);
  });

  it("hides a newly unpublished project from the public read path", async () => {
    const result = await rolledBack(async (tx) => {
      await setPublicationStatusWithin(tx, "edgememory", "draft");
      const publicRows = await readProjectsFromDatabase(tx as never, {
        publicationStatus: "published",
      });
      const adminRows = await listProjectsForAdmin(tx);
      return {
        publicSlugs: publicRows.map((p) => p.slug),
        adminSlugs: adminRows.map((r) => r.slug),
      };
    });

    expect(result.publicSlugs).not.toContain("edgememory");
    expect(result.publicSlugs).toHaveLength(12);
    // Still fully visible and editable in the admin.
    expect(result.adminSlugs).toContain("edgememory");
    expect(result.adminSlugs).toHaveLength(13);
  });

  it("rejects an unknown slug with a typed error", async () => {
    const error = await rolledBack(async (tx) =>
      setPublicationStatusWithin(tx, "no-such-project", "published").catch((e: unknown) => e),
    );

    expect(error).toBeInstanceOf(ProjectNotFoundError);
  });
});

// ---------------------------------------------------------------------------
// Revisions — Phase 10
// ---------------------------------------------------------------------------

describe("revision recording", () => {
  it("writes a revision when a project is created", async () => {
    const result = await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values(), new Date(), {
        actor: "admin@example.test",
      });
      const revisions = await listProjectRevisions(created.id, tx);
      return { created, revisions };
    });

    expect(result.revisions).toHaveLength(1);
    expect(result.revisions[0].versionNumber).toBe(1);
    expect(result.revisions[0].changeSummary).toBe("Created");
    expect(result.revisions[0].createdBy).toBe("admin@example.test");
  });

  it("numbers revisions monotonically across create, edit and publish", async () => {
    // The falsifying case for the core hypothesis: if any write path misses a
    // revision, or two paths reuse a number, this sequence is not 1,2,3.
    const versions = await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values({ publicationStatus: "draft" }));
      await updateProjectWithin(tx, TEST_SLUG, values({ title: "Edited Title" }));
      await setPublicationStatusWithin(tx, TEST_SLUG, "published");
      const revisions = await listProjectRevisions(created.id, tx);
      return revisions.map((r) => r.versionNumber);
    });

    // listProjectRevisions is newest-first.
    expect(versions).toEqual([3, 2, 1]);
  });

  it("records a revision for publish and for unpublish", async () => {
    const summaries = await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values({ publicationStatus: "draft" }));
      await setPublicationStatusWithin(tx, TEST_SLUG, "published");
      await setPublicationStatusWithin(tx, TEST_SLUG, "draft");
      const revisions = await listProjectRevisions(created.id, tx);
      return revisions.map((r) => ({
        summary: r.changeSummary,
        status: r.publicationStatusAtRevision,
      }));
    });

    expect(summaries).toHaveLength(3);
    // Newest first: unpublish, publish, create.
    expect(summaries[0]).toEqual({ summary: "Set to draft", status: "draft" });
    expect(summaries[1]).toEqual({ summary: "Published", status: "published" });
    expect(summaries[2]).toEqual({ summary: "Created", status: "draft" });
  });

  it("captures the content as it stood, children included", async () => {
    const snapshot = await rolledBack(async (tx) => {
      const created = await createProjectWithin(
        tx,
        values({
          title: "Snapshot Me",
          technologies: ["ZZ Fixture R1", "ZZ Fixture R2"],
          verificationNotes: "Internal. [NEEDS VERIFICATION]",
        }),
      );
      const revisions = await listProjectRevisions(created.id, tx);
      const full = await getProjectRevision(created.id, revisions[0].id, tx);
      return full!.snapshot;
    });

    expect(snapshot.project.title).toBe("Snapshot Me");
    // Children are part of the snapshot, not just the scalar row.
    expect(snapshot.project.technologies).toEqual(["ZZ Fixture R1", "ZZ Fixture R2"]);
    // The admin-only field is preserved in history — which is precisely why
    // this table must never be read by a public route.
    expect(snapshot.project.verificationNotes).toContain("[NEEDS VERIFICATION]");
    expect(snapshot.publicationStatus).toBe("draft");
    expect(snapshot.contentOrigin).toBe("cms");
    expect(snapshot.publishedAt).toBeNull();
  });

  it("snapshots the content AFTER the edit, not before", async () => {
    const titles = await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values({ title: "First" }));
      await updateProjectWithin(tx, TEST_SLUG, values({ title: "Second" }));
      const revisions = await listProjectRevisions(created.id, tx);
      const newest = await getProjectRevision(created.id, revisions[0].id, tx);
      const oldest = await getProjectRevision(created.id, revisions[1].id, tx);
      return { newest: newest!.snapshot.project.title, oldest: oldest!.snapshot.project.title };
    });

    expect(titles.newest).toBe("Second");
    // History is preserved, not overwritten (§53).
    expect(titles.oldest).toBe("First");
  });

  it("stamps publishedAt into the snapshot once published", async () => {
    const snapshot = await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values({ publicationStatus: "draft" }));
      await setPublicationStatusWithin(tx, TEST_SLUG, "published");
      const revisions = await listProjectRevisions(created.id, tx);
      const full = await getProjectRevision(created.id, revisions[0].id, tx);
      return full!.snapshot;
    });

    expect(snapshot.publicationStatus).toBe("published");
    expect(snapshot.publishedAt).not.toBeNull();
    // Stored as an ISO string, because the column is JSON.
    expect(typeof snapshot.publishedAt).toBe("string");
  });

  it("leaves createdBy null rather than inventing an author", async () => {
    const createdBy = await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values());
      const revisions = await listProjectRevisions(created.id, tx);
      return revisions[0].createdBy;
    });

    expect(createdBy).toBeNull();
  });
});

describe("revision isolation between projects", () => {
  it("numbers each project's history independently", async () => {
    const result = await rolledBack(async (tx) => {
      const a = await createProjectWithin(tx, values({ slug: `${TEST_SLUG}-a` }));
      const b = await createProjectWithin(tx, values({ slug: `${TEST_SLUG}-b` }));
      await updateProjectWithin(tx, `${TEST_SLUG}-a`, values({ slug: `${TEST_SLUG}-a` }));
      await updateProjectWithin(tx, `${TEST_SLUG}-a`, values({ slug: `${TEST_SLUG}-a` }));

      return {
        a: (await listProjectRevisions(a.id, tx)).map((r) => r.versionNumber),
        b: (await listProjectRevisions(b.id, tx)).map((r) => r.versionNumber),
      };
    });

    // Three edits to A must not advance B's numbering.
    expect(result.a).toEqual([3, 2, 1]);
    expect(result.b).toEqual([1]);
  });

  it("never returns another project's revision", async () => {
    const found = await rolledBack(async (tx) => {
      const a = await createProjectWithin(tx, values({ slug: `${TEST_SLUG}-a` }));
      const b = await createProjectWithin(tx, values({ slug: `${TEST_SLUG}-b` }));
      const aRevision = (await listProjectRevisions(a.id, tx))[0];
      // Ask for A's revision id while claiming it belongs to B.
      return getProjectRevision(b.id, aRevision.id, tx);
    });

    expect(found).toBeNull();
  });

  it("does not create revisions for projects it did not touch", async () => {
    const counts = await rolledBack(async (tx) => {
      const before = await tx.contentRevision.count();
      await createProjectWithin(tx, values());
      const after = await tx.contentRevision.count();
      // Cortex Lab is never written, so it must have no history at all.
      const cortex = await tx.project.findUniqueOrThrow({
        where: { slug: "cortex-lab" },
        select: { id: true },
      });
      return {
        added: after - before,
        cortexRevisions: await listProjectRevisions(cortex.id, tx),
      };
    });

    expect(counts.added).toBe(1);
    expect(counts.cortexRevisions).toEqual([]);
  });
});

describe("revisions are rollback-safe", () => {
  it("leaves no revision behind when the write is rolled back", async () => {
    // The decisive test for the design: revisions share the caller's
    // transaction, so history can never record content that was never
    // committed. If this fails, recording is happening outside the
    // transaction and the whole approach is wrong.
    const before = await prisma.contentRevision.count();

    await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values());
      await updateProjectWithin(tx, TEST_SLUG, values({ title: "Changed" }));
      await setPublicationStatusWithin(tx, TEST_SLUG, "published");
      // Three revisions exist inside the transaction...
      expect(await listProjectRevisions(created.id, tx)).toHaveLength(3);
    });

    // ...and none of them survive it.
    expect(await prisma.contentRevision.count()).toBe(before);
  });

  it("writes no revision when the write itself fails", async () => {
    const before = await prisma.contentRevision.count();

    await rolledBack(async (tx) => {
      // Colliding with a real project's slug aborts the create.
      await expect(
        createProjectWithin(tx, values({ slug: "the-inevitable" })),
      ).rejects.toBeInstanceOf(DuplicateSlugError);
    });

    expect(await prisma.contentRevision.count()).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Restore — CMS_SPECIFICATION.md §49, ADMIN_DASHBOARD_SPECIFICATION.md §59
// ---------------------------------------------------------------------------

describe("restoreProjectRevisionWithin", () => {
  it("restores the content of the revision asked for, not the newest one", async () => {
    const result = await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values({ title: "First Title" }));
      await updateProjectWithin(tx, TEST_SLUG, values({ title: "Second Title" }));
      await updateProjectWithin(tx, TEST_SLUG, values({ title: "Third Title" }));

      const history = await listProjectRevisions(created.id, tx);
      const v1 = history.find((r) => r.versionNumber === 1)!;

      const restore = await restoreProjectRevisionWithin(tx, TEST_SLUG, v1.id);
      const row = await tx.project.findUniqueOrThrow({ where: { slug: TEST_SLUG } });

      return { restore, title: row.title };
    });

    expect(result.title).toBe("First Title");
    expect(result.restore.restoredFrom).toBe(1);
    expect(result.restore.newVersion).toBe(4);
  });

  it("restores every field the editor owns, not just the obvious ones", async () => {
    const original = values({
      title: "Original",
      shortDescription: "The original summary.",
      verificationNotes: "Original internal note. [NEEDS VERIFICATION]",
      technologies: ["TypeScript", "PostgreSQL"],
      githubUrl: "https://example.com/original",
      featured: true,
      evidenceStatus: "partially-verified",
      category: "research",
    });

    const row = await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, original);
      await updateProjectWithin(
        tx,
        TEST_SLUG,
        values({
          title: "Replaced",
          shortDescription: "Replaced summary.",
          verificationNotes: "",
          technologies: ["Python"],
          githubUrl: null,
          featured: false,
          evidenceStatus: "self-reported",
          category: "supporting",
        }),
      );

      const v1 = (await listProjectRevisions(created.id, tx)).find((r) => r.versionNumber === 1)!;
      await restoreProjectRevisionWithin(tx, TEST_SLUG, v1.id);

      return tx.project.findUniqueOrThrow({
        where: { slug: TEST_SLUG },
        include: {
          technologies: {
            orderBy: { displayOrder: "asc" },
            include: { technology: { select: { name: true } } },
          },
        },
      });
    });

    expect(row.title).toBe("Original");
    expect(row.shortDescription).toBe("The original summary.");
    expect(row.verificationNotes).toBe("Original internal note. [NEEDS VERIFICATION]");
    expect(row.featured).toBe(true);
    expect(row.githubUrl).toBe("https://example.com/original");
    expect(row.evidenceStatus).toBe("partially_verified");
    expect(row.category).toBe("research");
    expect(row.technologies.map((t) => t.technology.name)).toEqual(["TypeScript", "PostgreSQL"]);
  });

  it("does NOT publish a draft, even from a revision taken while published", async () => {
    // The disconfirming test for the whole design. If restore wrote the
    // snapshot's own publication status, restoring a published-era revision
    // would put content live with no publish step and no confirmation.
    const result = await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values({ title: "Draft Era" }));
      await setPublicationStatusWithin(tx, TEST_SLUG, "published");
      // The edit form owns publicationStatus, so an edit made while the
      // project is live must say so — otherwise the edit itself unpublishes.
      await updateProjectWithin(
        tx,
        TEST_SLUG,
        values({ title: "While Published", publicationStatus: "published" }),
      );
      await setPublicationStatusWithin(tx, TEST_SLUG, "draft");

      // v3 was taken while the project was published.
      const v3 = (await listProjectRevisions(created.id, tx)).find((r) => r.versionNumber === 3)!;
      expect(v3.publicationStatusAtRevision).toBe("published");

      const restore = await restoreProjectRevisionWithin(tx, TEST_SLUG, v3.id);
      const row = await tx.project.findUniqueOrThrow({ where: { slug: TEST_SLUG } });
      return { restore, row };
    });

    // The content came back...
    expect(result.row.title).toBe("While Published");
    // ...and the project is still a draft.
    expect(result.row.publicationStatus).toBe("draft");
    expect(result.restore.publicationStatus).toBe("draft");
  });

  it("does NOT unpublish a live project when restoring a draft-era revision", async () => {
    // The mirror failure, and the more damaging one: a live project silently
    // vanishing from the public site because someone restored old wording.
    const row = await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values({ title: "Draft Era" }));
      await updateProjectWithin(tx, TEST_SLUG, values({ title: "Still Draft" }));
      await setPublicationStatusWithin(tx, TEST_SLUG, "published");

      const v1 = (await listProjectRevisions(created.id, tx)).find((r) => r.versionNumber === 1)!;
      expect(v1.publicationStatusAtRevision).toBe("draft");

      await restoreProjectRevisionWithin(tx, TEST_SLUG, v1.id);
      return tx.project.findUniqueOrThrow({ where: { slug: TEST_SLUG } });
    });

    expect(row.title).toBe("Draft Era");
    expect(row.publicationStatus).toBe("published");
  });

  it("leaves published_at exactly as it was", async () => {
    // §46: when a project first went live is part of the record. A restore is
    // not a publication event and must not move or clear it.
    const result = await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values());
      await setPublicationStatusWithin(tx, TEST_SLUG, "published");
      const before = await tx.project.findUniqueOrThrow({
        where: { slug: TEST_SLUG },
        select: { publishedAt: true },
      });

      const v1 = (await listProjectRevisions(created.id, tx)).find((r) => r.versionNumber === 1)!;
      await restoreProjectRevisionWithin(tx, TEST_SLUG, v1.id);

      const after = await tx.project.findUniqueOrThrow({
        where: { slug: TEST_SLUG },
        select: { publishedAt: true },
      });
      return { before: before.publishedAt, after: after.publishedAt };
    });

    expect(result.before).not.toBeNull();
    expect(result.after).toEqual(result.before);
  });
});

describe("restore preserves history", () => {
  it("appends a new revision instead of rewinding the numbering", async () => {
    const history = await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values({ title: "One" }));
      await updateProjectWithin(tx, TEST_SLUG, values({ title: "Two" }));
      await updateProjectWithin(tx, TEST_SLUG, values({ title: "Three" }));

      const v1 = (await listProjectRevisions(created.id, tx)).find((r) => r.versionNumber === 1)!;
      await restoreProjectRevisionWithin(tx, TEST_SLUG, v1.id);

      return listProjectRevisions(created.id, tx);
    });

    // §53: "Never destroy history silently." Nothing was removed or renumbered.
    expect(history.map((r) => r.versionNumber)).toEqual([4, 3, 2, 1]);
  });

  it("leaves the superseded revisions byte-for-byte as they were", async () => {
    const result = await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values({ title: "One" }));
      await updateProjectWithin(tx, TEST_SLUG, values({ title: "Two" }));

      const before = await tx.contentRevision.findMany({
        where: { entityType: "project", entityId: created.id },
        orderBy: { versionNumber: "asc" },
      });

      const v1 = before.find((r) => r.versionNumber === 1)!;
      await restoreProjectRevisionWithin(tx, TEST_SLUG, v1.id);

      const after = await tx.contentRevision.findMany({
        where: { entityType: "project", entityId: created.id, versionNumber: { lte: 2 } },
        orderBy: { versionNumber: "asc" },
      });
      return { before, after };
    });

    expect(result.after).toEqual(result.before);
  });

  it("records who restored and which version it came from", async () => {
    // SECURITY_AND_QUALITY.md §157 lists restoring a revision as an action
    // that must be attributable.
    const latest = await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values());
      await updateProjectWithin(tx, TEST_SLUG, values({ title: "Changed" }));

      const v1 = (await listProjectRevisions(created.id, tx)).find((r) => r.versionNumber === 1)!;
      await restoreProjectRevisionWithin(tx, TEST_SLUG, v1.id, new Date(), {
        actor: "admin@example.com",
      });

      return (await listProjectRevisions(created.id, tx))[0];
    });

    expect(latest.versionNumber).toBe(3);
    expect(latest.changeSummary).toBe("Restored v1");
    expect(latest.createdBy).toBe("admin@example.com");
  });

  it("makes the restore itself restorable", async () => {
    // The content before a restore is not lost: it is the revision recorded
    // immediately before it, so an unwanted restore is undone by restoring
    // that one.
    const title = await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values({ title: "One" }));
      await updateProjectWithin(tx, TEST_SLUG, values({ title: "Two" }));

      const history = await listProjectRevisions(created.id, tx);
      const v1 = history.find((r) => r.versionNumber === 1)!;
      const v2 = history.find((r) => r.versionNumber === 2)!;

      await restoreProjectRevisionWithin(tx, TEST_SLUG, v1.id); // back to "One"
      await restoreProjectRevisionWithin(tx, TEST_SLUG, v2.id); // and forward again

      return (await tx.project.findUniqueOrThrow({ where: { slug: TEST_SLUG } })).title;
    });

    expect(title).toBe("Two");
  });
});

describe("restore project isolation", () => {
  it("refuses a revision id belonging to another project", async () => {
    const outcome = await rolledBack(async (tx) => {
      const a = await createProjectWithin(tx, values({ slug: `${TEST_SLUG}-a`, title: "A" }));
      await createProjectWithin(tx, values({ slug: `${TEST_SLUG}-b`, title: "B" }));

      const aRevision = (await listProjectRevisions(a.id, tx))[0];

      // Ask B to restore one of A's revisions. The pair does not match.
      await expect(
        restoreProjectRevisionWithin(tx, `${TEST_SLUG}-b`, aRevision.id),
      ).rejects.toBeInstanceOf(RevisionNotFoundError);

      return tx.project.findUniqueOrThrow({ where: { slug: `${TEST_SLUG}-b` } });
    });

    // B kept its own content — A's title did not leak across.
    expect(outcome.title).toBe("B");
  });

  it("does not touch any other project's row or history", async () => {
    const result = await rolledBack(async (tx) => {
      const a = await createProjectWithin(tx, values({ slug: `${TEST_SLUG}-a`, title: "A one" }));
      const b = await createProjectWithin(tx, values({ slug: `${TEST_SLUG}-b`, title: "B one" }));
      await updateProjectWithin(
        tx,
        `${TEST_SLUG}-a`,
        values({ slug: `${TEST_SLUG}-a`, title: "A two" }),
      );

      const bBefore = await tx.project.findUniqueOrThrow({ where: { id: b.id } });
      const v1 = (await listProjectRevisions(a.id, tx)).find((r) => r.versionNumber === 1)!;
      await restoreProjectRevisionWithin(tx, `${TEST_SLUG}-a`, v1.id);

      // Cortex Lab is never written by the CMS, and a restore is no exception.
      const cortex = await tx.project.findUniqueOrThrow({ where: { slug: "cortex-lab" } });

      return {
        bBefore,
        bAfter: await tx.project.findUniqueOrThrow({ where: { id: b.id } }),
        bHistory: await listProjectRevisions(b.id, tx),
        cortexRevisions: await listProjectRevisions(cortex.id, tx),
        cortexUpdatedAt: cortex.updatedAt,
      };
    });

    expect(result.bAfter).toEqual(result.bBefore);
    expect(result.bHistory.map((r) => r.versionNumber)).toEqual([1]);
    expect(result.cortexRevisions).toEqual([]);
    expect(result.cortexUpdatedAt).toEqual(new Date("2026-09-12T05:40:34.450Z"));
  });
});

describe("what a restore must NOT destroy", () => {
  it("leaves metrics, list items, notes, alternate names and relationships untouched", async () => {
    // Restore runs through updateProjectWithin precisely so it inherits this
    // property rather than re-deriving it. Asserted directly anyway: a future
    // bespoke restore writer would pass every other test in this file and
    // still silently delete the evidence-graded content.
    const result = await rolledBack(async (tx) => {
      const project = await tx.project.create({
        data: {
          slug: TEST_SLUG,
          title: "Fixture With Children",
          shortDescription: "x",
          category: "supporting",
          status: "Completed",
          evidenceStatus: "self_reported",
          verificationNotes: "x",
          featured: false,
          source: "GitHub",
          displayOrder: 902,
          publicationStatus: "draft",
          metrics: {
            create: [
              {
                label: "Accuracy",
                value: "[NEEDS VERIFICATION]",
                kind: "needs_verification",
                displayOrder: 0,
              },
            ],
          },
          contentListItems: {
            create: [{ listType: "results", body: "A result.", displayOrder: 0 }],
          },
          implementationNotes: {
            create: [{ label: "Retrieval", status: "specified", displayOrder: 0 }],
          },
          alternateNames: { create: [{ name: "Alt Name", displayOrder: 0 }] },
        },
        select: { id: true },
      });

      // Two revisions of the parent row, with the children left alone.
      await updateProjectWithin(tx, TEST_SLUG, values({ title: "Version one" }));
      await updateProjectWithin(tx, TEST_SLUG, values({ title: "Version two" }));

      const v1 = (await listProjectRevisions(project.id, tx)).find((r) => r.versionNumber === 1)!;
      await restoreProjectRevisionWithin(tx, TEST_SLUG, v1.id);

      return tx.project.findUniqueOrThrow({
        where: { id: project.id },
        include: {
          _count: {
            select: {
              metrics: true,
              contentListItems: true,
              implementationNotes: true,
              alternateNames: true,
            },
          },
        },
      });
    });

    expect(result.title).toBe("Version one");
    expect(result._count.metrics).toBe(1);
    expect(result._count.contentListItems).toBe(1);
    expect(result._count.implementationNotes).toBe(1);
    expect(result._count.alternateNames).toBe(1);
  });
});

describe("restore refusals", () => {
  it("refuses an unknown project", async () => {
    await rolledBack(async (tx) => {
      await expect(
        restoreProjectRevisionWithin(tx, "zz-no-such-project", 1),
      ).rejects.toBeInstanceOf(ProjectNotFoundError);
    });
  });

  it("refuses a revision id that does not exist", async () => {
    await rolledBack(async (tx) => {
      await createProjectWithin(tx, values());
      await expect(restoreProjectRevisionWithin(tx, TEST_SLUG, 2_000_000_000)).rejects.toBeInstanceOf(
        RevisionNotFoundError,
      );
    });
  });

  it("refuses a snapshot that no longer passes the editor's validation", async () => {
    // §49 and §59 both require restore to validate the content. A revision
    // written under a vocabulary that has since changed must be refused, not
    // coerced into the nearest surviving member.
    const outcome = await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values({ title: "Good Content" }));
      await updateProjectWithin(tx, TEST_SLUG, values({ title: "Newer Content" }));

      const v1 = (await listProjectRevisions(created.id, tx)).find((r) => r.versionNumber === 1)!;
      const stored = await tx.contentRevision.findUniqueOrThrow({ where: { id: v1.id } });

      // Simulate a snapshot from a schema this code no longer knows.
      await tx.contentRevision.update({
        where: { id: v1.id },
        data: {
          snapshot: {
            ...(stored.snapshot as object),
            project: {
              ...((stored.snapshot as { project: object }).project as object),
              category: "a-category-that-no-longer-exists",
            },
          },
        },
      });

      await expect(restoreProjectRevisionWithin(tx, TEST_SLUG, v1.id)).rejects.toBeInstanceOf(
        InvalidRevisionError,
      );

      return {
        row: await tx.project.findUniqueOrThrow({ where: { slug: TEST_SLUG } }),
        history: await listProjectRevisions(created.id, tx),
      };
    });

    // Nothing was written: the project keeps its current content and no
    // revision was recorded for the refused restore.
    expect(outcome.row.title).toBe("Newer Content");
    expect(outcome.history).toHaveLength(2);
  });

  it("refuses when the revision's slug now belongs to another project", async () => {
    // A revision carries the slug the project had at the time, so restoring
    // it is also a rename — and the rename can collide.
    //
    // Nothing is asserted about the rows afterwards, and deliberately so: the
    // UNIQUE violation aborts the PostgreSQL transaction (SQLSTATE 25P02), and
    // every further statement on that handle is refused. That abort *is* the
    // safety property — in production `restoreProjectRevision` owns the
    // transaction, so a collision rolls the whole restore back rather than
    // leaving the project half-renamed. Reading the rows here would only be
    // testing that PostgreSQL still lets one read from a dead transaction,
    // which it does not.
    await rolledBack(async (tx) => {
      const a = await createProjectWithin(tx, values({ slug: `${TEST_SLUG}-a`, title: "A" }));
      // Rename A, freeing its original slug...
      await updateProjectWithin(
        tx,
        `${TEST_SLUG}-a`,
        values({ slug: `${TEST_SLUG}-renamed`, title: "A renamed" }),
      );
      // ...and give it to a different project.
      await createProjectWithin(tx, values({ slug: `${TEST_SLUG}-a`, title: "Squatter" }));

      const v1 = (await listProjectRevisions(a.id, tx)).find((r) => r.versionNumber === 1)!;
      await expect(
        restoreProjectRevisionWithin(tx, `${TEST_SLUG}-renamed`, v1.id),
      ).rejects.toBeInstanceOf(DuplicateSlugError);
    });
  });
});

describe("restore is rollback-safe", () => {
  it("leaves neither content nor history behind when rolled back", async () => {
    const beforeProjects = await prisma.project.count();
    const beforeRevisions = await prisma.contentRevision.count();

    await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values({ title: "One" }));
      await updateProjectWithin(tx, TEST_SLUG, values({ title: "Two" }));
      const v1 = (await listProjectRevisions(created.id, tx)).find((r) => r.versionNumber === 1)!;
      await restoreProjectRevisionWithin(tx, TEST_SLUG, v1.id);

      // Three revisions exist inside the transaction...
      expect(await listProjectRevisions(created.id, tx)).toHaveLength(3);
    });

    // ...and none of them, nor the project, survive it.
    expect(await prisma.project.count()).toBe(beforeProjects);
    expect(await prisma.contentRevision.count()).toBe(beforeRevisions);
  });

  it("writes nothing at all when the restore fails part-way", async () => {
    const before = await prisma.contentRevision.count();

    await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values());
      await expect(
        restoreProjectRevisionWithin(tx, TEST_SLUG, 2_000_000_000),
      ).rejects.toBeInstanceOf(RevisionNotFoundError);

      // The failed restore added no revision to the project's history.
      expect(await listProjectRevisions(created.id, tx)).toHaveLength(1);
    });

    expect(await prisma.contentRevision.count()).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Comparison — CMS_SPECIFICATION.md §48, ADMIN_DASHBOARD_SPECIFICATION.md §58
// ---------------------------------------------------------------------------

describe("comparing real stored snapshots", () => {
  it("diffs two revisions read back out of PostgreSQL", async () => {
    // lib/admin/revision-diff.test.ts compares hand-built objects. This runs
    // the same code over snapshots that made a real round trip through the
    // `jsonb` column, which is where a shape assumption would actually break.
    const result = await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values({ title: "One" }));
      await updateProjectWithin(
        tx,
        TEST_SLUG,
        values({ title: "Two", technologies: ["TypeScript"] }),
      );

      const history = await listProjectRevisions(created.id, tx);
      const v1 = await getProjectRevision(
        created.id,
        history.find((r) => r.versionNumber === 1)!.id,
        tx,
      );
      const v2 = await getProjectRevision(
        created.id,
        history.find((r) => r.versionNumber === 2)!.id,
        tx,
      );

      return compareSnapshots(v1!.snapshot, v2!.snapshot);
    });

    expect(result.identical).toBe(false);
    const title = result.content.find((entry) => entry.field === "title")!;
    expect(title).toMatchObject({ before: "One", after: "Two", changed: true });
    const technologies = result.content.find((entry) => entry.field === "technologies")!;
    expect(technologies).toMatchObject({ before: "—", after: "TypeScript", changed: true });
    // The slug never moved, and is reported as unchanged rather than omitted.
    expect(result.content.find((entry) => entry.field === "slug")!.changed).toBe(false);
  });

  it("reports a publish as recorded state, not as a content change", async () => {
    // Publishing records a revision whose content is identical to the one
    // before it. A comparison that called that a content change would tell the
    // operator a restore was about to alter the project's wording.
    const result = await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values({ title: "Stable" }));
      await setPublicationStatusWithin(tx, TEST_SLUG, "published");

      const history = await listProjectRevisions(created.id, tx);
      const v1 = await getProjectRevision(
        created.id,
        history.find((r) => r.versionNumber === 1)!.id,
        tx,
      );
      const v2 = await getProjectRevision(
        created.id,
        history.find((r) => r.versionNumber === 2)!.id,
        tx,
      );

      return compareSnapshots(v1!.snapshot, v2!.snapshot);
    });

    expect(result.identical).toBe(true);
    expect(result.changedCount).toBe(0);
    const status = result.state.find((entry) => entry.field === "publicationStatus")!;
    expect(status).toMatchObject({ before: "draft", after: "published", changed: true });
  });

  it("cannot assemble a comparison across two projects", async () => {
    // The isolation that makes the route safe lives in the repository: one of
    // the two lookups simply returns null, so there is nothing to compare.
    const found = await rolledBack(async (tx) => {
      const a = await createProjectWithin(tx, values({ slug: `${TEST_SLUG}-a` }));
      const b = await createProjectWithin(tx, values({ slug: `${TEST_SLUG}-b` }));
      const aRevision = (await listProjectRevisions(a.id, tx))[0];

      // Ask for A's revision while claiming it belongs to B.
      return getProjectRevision(b.id, aRevision.id, tx);
    });

    expect(found).toBeNull();
  });

  it("writes nothing at all", async () => {
    const beforeProjects = await prisma.project.count();
    const beforeRevisions = await prisma.contentRevision.count();

    const counts = await rolledBack(async (tx) => {
      const created = await createProjectWithin(tx, values({ title: "One" }));
      await updateProjectWithin(tx, TEST_SLUG, values({ title: "Two" }));

      const history = await listProjectRevisions(created.id, tx);
      const v1 = await getProjectRevision(created.id, history[1].id, tx);
      const v2 = await getProjectRevision(created.id, history[0].id, tx);

      const revisionsBefore = await tx.contentRevision.count();
      compareSnapshots(v1!.snapshot, v2!.snapshot);
      const revisionsAfter = await tx.contentRevision.count();

      return { revisionsBefore, revisionsAfter };
    });

    // Comparing recorded nothing inside the transaction...
    expect(counts.revisionsAfter).toBe(counts.revisionsBefore);
    // ...and the database outside it is untouched.
    expect(await prisma.project.count()).toBe(beforeProjects);
    expect(await prisma.contentRevision.count()).toBe(beforeRevisions);
  });
});

describe("the real database is untouched by revisions so far", () => {
  it("holds no revisions for any of the 13 existing projects", async () => {
    // Nothing has been edited through the CMS, so there is nothing to record.
    // This also proves the migration did not backfill invented history.
    expect(await prisma.contentRevision.count()).toBe(0);
  });
});
