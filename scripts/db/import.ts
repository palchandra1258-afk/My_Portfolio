// Phase 7B-1 — Import.
//
// Writes the normalized, validated content into the local PostgreSQL replica
// (docs/DATABASE_DESIGN.md §25). Direction is one-way and always the same:
//
//     content/*.ts  ──►  PostgreSQL
//
// TypeScript stays authoritative; the database is a derived replica
// (CLAUDE.md §4, PORTFOLIO_ARCHITECTURE.md §13). Nothing in this file ever
// writes back to content/*.ts, and no value is altered on the way in.
//
// Idempotent by construction. Re-running produces the same content, because
// every write is keyed on a natural key from the source:
//   - projects        upserted by `slug`
//   - technologies    upserted by `name`
//   - profile         upserted by `id = 1` (Constraint B)
//   - all child rows  deleted for the rows in scope, then re-inserted in
//                     source order
// Surrogate ids of child rows therefore change between runs; content,
// ordering and row counts do not. Verification compares content, not ids.
//
// Everything happens inside one transaction: a failed import leaves the
// database exactly as it was.

import type { PrismaClient } from "@/lib/generated/prisma/client";
import type {
  NormalizedData,
  NormalizedProject,
  PrismaContentListType,
  PrismaImplementationStatus,
  PrismaMetricStatus,
  PrismaProjectCategory,
  PrismaProjectSource,
  PrismaProjectStatus,
  PrismaSkillSource,
  PrismaVerificationStatus,
} from "./normalize";

/** Narrow alias for the transactional client handed to the callback by $transaction. */
type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export interface ImportOptions {
  /**
   * Restrict the import to these project slugs. Used for the pilot run
   * (IMPLEMENTATION_ROADMAP.md §77: one project → compare → approve → rest).
   * Omit for a full import of all projects.
   */
  projectSlugs?: string[];
  /** Import the profile singleton. Default true. */
  includeProfile?: boolean;
  /**
   * Report what would be written and, crucially, what would be deleted,
   * without opening a write transaction.
   */
  dryRun?: boolean;
  /**
   * Permit overwriting rows the CMS has edited.
   *
   * Off by default, and the default is the whole point. Since Phase 7 the
   * admin UI can write project rows, so an unguarded import — which rewrites
   * every scalar and replaces every child collection wholesale — would
   * silently destroy those edits and there would be no copy anywhere. The
   * importer refuses instead, and names the projects it would have clobbered.
   */
  overwriteCmsAuthored?: boolean;
}

export interface ImportReport {
  scope: "full" | "partial";
  dryRun: boolean;
  projectSlugs: string[];
  /** Pre-existing rows removed before re-insert, per table. Zero on a first run. */
  deletions: Record<string, number>;
  /** Rows written, per table. */
  inserts: Record<string, number>;
  /**
   * Relationships whose target project is not in the database yet. Only
   * possible during a partial (pilot) import; a full import resolves all of
   * them, and validate.ts has already proven every slug resolves in source.
   */
  deferredRelationships: { source: string; related: string }[];
  /** Technology rows removed because no in-source project references them any more. */
  prunedTechnologies: string[];
  /** Project rows removed because their slug no longer exists in content/projects.ts. */
  prunedProjects: string[];
  /**
   * In-scope slugs whose current contents came from the CMS, not from
   * content/*.ts. Importing over these discards the CMS edit.
   */
  cmsAuthored: string[];
}

function emptyReport(scope: "full" | "partial", dryRun: boolean, slugs: string[]): ImportReport {
  return {
    scope,
    dryRun,
    projectSlugs: slugs,
    deletions: {},
    inserts: {},
    deferredRelationships: [],
    prunedTechnologies: [],
    prunedProjects: [],
    cmsAuthored: [],
  };
}

/**
 * The in-scope projects whose current contents came from the CMS.
 *
 * `db:import` rewrites every scalar and replaces every child collection, so
 * running it over one of these throws the CMS edit away with nothing to
 * recover it from. The importer refuses unless told otherwise; this is the
 * query that decides.
 */
async function findCmsAuthored(
  client: PrismaClient | Tx,
  slugs: string[],
): Promise<string[]> {
  if (slugs.length === 0) return [];
  const rows = await client.project.findMany({
    where: { slug: { in: slugs }, contentOrigin: "cms" },
    select: { slug: true },
    orderBy: { slug: "asc" },
  });
  return rows.map((row) => row.slug);
}

/** Message shared by the plan and the write path, so both say the same thing. */
export function cmsOverwriteRefusal(slugs: string[]): string {
  return [
    `Refusing to import over ${slugs.length} CMS-edited project(s): ${slugs.join(", ")}.`,
    "  These rows were last written through the admin UI, not by content/*.ts.",
    "  An import replaces every field and every child row, so the edits would be lost",
    "  and there is no copy of them anywhere else.",
    "  Either re-apply the change in content/*.ts first, or pass --overwrite-cms to",
    "  discard the CMS version deliberately.",
  ].join("\n");
}

function bump(counter: Record<string, number>, table: string, n: number): void {
  if (n === 0 && counter[table] === undefined) counter[table] = 0;
  else counter[table] = (counter[table] ?? 0) + n;
}

/**
 * Counts the rows an import would delete, without writing anything. Separated
 * out so a caller can require explicit approval before any destructive write.
 */
export async function planImport(
  prisma: PrismaClient,
  data: NormalizedData,
  options: ImportOptions = {},
): Promise<ImportReport> {
  const { inScope, scope } = selectProjects(data, options.projectSlugs);
  const includeProfile = options.includeProfile ?? true;
  const report = emptyReport(scope, true, inScope.map((p) => p.slug));

  const slugs = inScope.map((p) => p.slug);
  const existing = await prisma.project.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
  const existingIds = existing.map((p) => p.id);
  report.cmsAuthored = await findCmsAuthored(prisma, slugs);

  bump(report.deletions, "projects", 0); // upserted in place, never deleted
  bump(
    report.deletions,
    "project_alternate_names",
    await prisma.projectAlternateName.count({ where: { projectId: { in: existingIds } } }),
  );
  bump(
    report.deletions,
    "project_metrics",
    await prisma.projectMetric.count({ where: { projectId: { in: existingIds } } }),
  );
  bump(
    report.deletions,
    "project_implementation_notes",
    await prisma.projectImplementationNote.count({ where: { projectId: { in: existingIds } } }),
  );
  bump(
    report.deletions,
    "project_content_list_items",
    await prisma.projectContentListItem.count({ where: { projectId: { in: existingIds } } }),
  );
  bump(
    report.deletions,
    "project_technologies",
    await prisma.projectTechnology.count({ where: { projectId: { in: existingIds } } }),
  );
  bump(
    report.deletions,
    "project_relationships",
    await prisma.projectRelationship.count({ where: { sourceProjectId: { in: existingIds } } }),
  );

  if (scope === "full") {
    const sourceSlugs = new Set(data.projects.map((p) => p.slug));
    const stale = await prisma.project.findMany({
      where: { slug: { notIn: [...sourceSlugs] } },
      select: { slug: true },
    });
    report.prunedProjects = stale.map((p) => p.slug);
  }

  if (includeProfile) {
    const profileRows = await prisma.profile.count({ where: { id: 1 } });
    bump(report.deletions, "profile", 0); // upserted in place
    if (profileRows > 0) {
      bump(report.deletions, "education", await prisma.education.count({ where: { profileId: 1 } }));
      bump(
        report.deletions,
        "experience_highlights",
        await prisma.experienceHighlight.count({ where: { experience: { profileId: 1 } } }),
      );
      bump(report.deletions, "experience", await prisma.experience.count({ where: { profileId: 1 } }));
      bump(
        report.deletions,
        "achievements",
        await prisma.achievement.count({ where: { profileId: 1 } }),
      );
      bump(report.deletions, "skills", await prisma.skill.count({ where: { profileId: 1 } }));
      bump(
        report.deletions,
        "finance_areas",
        await prisma.financeArea.count({ where: { profileId: 1 } }),
      );
      bump(
        report.deletions,
        "technology_finance_areas",
        await prisma.technologyFinanceArea.count({ where: { profileId: 1 } }),
      );
    }
  }

  return report;
}

function selectProjects(
  data: NormalizedData,
  projectSlugs?: string[],
): { inScope: NormalizedProject[]; scope: "full" | "partial" } {
  if (!projectSlugs || projectSlugs.length === 0) {
    return { inScope: data.projects, scope: "full" };
  }
  const wanted = new Set(projectSlugs);
  const inScope = data.projects.filter((p) => wanted.has(p.slug));
  const missing = projectSlugs.filter((s) => !data.projects.some((p) => p.slug === s));
  if (missing.length > 0) {
    throw new Error(
      `Unknown project slug(s): ${missing.join(", ")}. The import may only cover projects present in content/projects.ts.`,
    );
  }
  return { inScope, scope: inScope.length === data.projects.length ? "full" : "partial" };
}

async function importProjectRow(
  tx: Tx,
  project: NormalizedProject,
  technologyIds: Map<string, number>,
  report: ImportReport,
): Promise<number> {
  const scalars = {
    title: project.title,
    shortDescription: project.shortDescription,
    problem: project.problem,
    approach: project.approach,
    architecture: project.architecture,
    category: project.category as PrismaProjectCategory,
    status: project.status as PrismaProjectStatus,
    evidenceStatus: project.evidenceStatus as PrismaVerificationStatus,
    verificationNotes: project.verificationNotes,
    featured: project.featured,
    source: project.source as PrismaProjectSource,
    githubUrl: project.githubUrl,
    demoUrl: project.demoUrl,
    displayOrder: project.displayOrder,
    // DATABASE_DESIGN.md §25: every migrated row is `published`.
    // `publishedAt` is deliberately left null — the source content carries no
    // publication date, and inventing one would fabricate data (CLAUDE.md §6).
    publicationStatus: "published" as const,
    // This row's contents now come from content/*.ts again. Stamped on every
    // import so that re-importing over a CMS row (with --overwrite-cms) also
    // restores its provenance, rather than leaving it falsely marked `cms`.
    contentOrigin: "typescript_import" as const,
  };

  const row = await tx.project.upsert({
    where: { slug: project.slug },
    create: { slug: project.slug, ...scalars },
    update: scalars,
    select: { id: true },
  });
  bump(report.inserts, "projects", 1);

  // Replace every child collection wholesale, in source order. Reconciling row
  // by row would be more code for no benefit: the source array is the truth,
  // and a replace cannot drift from it.
  const del = await Promise.all([
    tx.projectAlternateName.deleteMany({ where: { projectId: row.id } }),
    tx.projectMetric.deleteMany({ where: { projectId: row.id } }),
    tx.projectImplementationNote.deleteMany({ where: { projectId: row.id } }),
    tx.projectContentListItem.deleteMany({ where: { projectId: row.id } }),
    tx.projectTechnology.deleteMany({ where: { projectId: row.id } }),
  ]);
  const tables = [
    "project_alternate_names",
    "project_metrics",
    "project_implementation_notes",
    "project_content_list_items",
    "project_technologies",
  ];
  del.forEach((r, i) => bump(report.deletions, tables[i], r.count));

  if (project.alternateNames.length > 0) {
    const r = await tx.projectAlternateName.createMany({
      data: project.alternateNames.map((a) => ({
        projectId: row.id,
        name: a.name,
        displayOrder: a.displayOrder,
      })),
    });
    bump(report.inserts, "project_alternate_names", r.count);
  }

  if (project.metrics.length > 0) {
    const r = await tx.projectMetric.createMany({
      data: project.metrics.map((m) => ({
        projectId: row.id,
        label: m.label,
        value: m.value,
        kind: m.kind as PrismaMetricStatus,
        note: m.note,
        source: m.source,
        displayOrder: m.displayOrder,
      })),
    });
    bump(report.inserts, "project_metrics", r.count);
  }

  if (project.implementationNotes.length > 0) {
    const r = await tx.projectImplementationNote.createMany({
      data: project.implementationNotes.map((n) => ({
        projectId: row.id,
        label: n.label,
        status: n.status as PrismaImplementationStatus,
        displayOrder: n.displayOrder,
      })),
    });
    bump(report.inserts, "project_implementation_notes", r.count);
  }

  if (project.contentListItems.length > 0) {
    const r = await tx.projectContentListItem.createMany({
      data: project.contentListItems.map((i) => ({
        projectId: row.id,
        listType: i.listType as PrismaContentListType,
        body: i.body,
        displayOrder: i.displayOrder,
      })),
    });
    bump(report.inserts, "project_content_list_items", r.count);
  }

  if (project.technologies.length > 0) {
    const r = await tx.projectTechnology.createMany({
      data: project.technologies.map((t) => {
        const technologyId = technologyIds.get(t.name);
        if (technologyId === undefined) {
          throw new Error(`Technology "${t.name}" was not registered before linking.`);
        }
        return { projectId: row.id, technologyId, displayOrder: t.displayOrder };
      }),
    });
    bump(report.inserts, "project_technologies", r.count);
  }

  return row.id;
}

async function importProfile(tx: Tx, data: NormalizedData, report: ImportReport): Promise<void> {
  const p = data.profile;
  const scalars = {
    name: p.name,
    location: p.location,
    phone: p.phone,
    email: p.email,
    githubUrl: p.githubUrl,
    linkedinUrl: p.linkedinUrl,
    summary: p.summary,
  };

  // id is fixed at 1 — Constraint B (CHECK id = 1) makes a second row
  // impossible, and this upsert is what guarantees the row exists at all.
  await tx.profile.upsert({
    where: { id: p.id },
    create: { id: p.id, ...scalars },
    update: scalars,
    select: { id: true },
  });
  bump(report.inserts, "profile", 1);

  // experience_highlights cascade from experience, but delete them explicitly
  // so the report counts them rather than hiding them inside a cascade.
  const highlightsDeleted = await tx.experienceHighlight.deleteMany({
    where: { experience: { profileId: p.id } },
  });
  bump(report.deletions, "experience_highlights", highlightsDeleted.count);

  const del = await Promise.all([
    tx.education.deleteMany({ where: { profileId: p.id } }),
    tx.experience.deleteMany({ where: { profileId: p.id } }),
    tx.achievement.deleteMany({ where: { profileId: p.id } }),
    tx.skill.deleteMany({ where: { profileId: p.id } }),
    tx.financeArea.deleteMany({ where: { profileId: p.id } }),
    tx.technologyFinanceArea.deleteMany({ where: { profileId: p.id } }),
  ]);
  const tables = [
    "education",
    "experience",
    "achievements",
    "skills",
    "finance_areas",
    "technology_finance_areas",
  ];
  del.forEach((r, i) => bump(report.deletions, tables[i], r.count));

  if (p.education.length > 0) {
    const r = await tx.education.createMany({
      data: p.education.map((e) => ({ profileId: p.id, ...e })),
    });
    bump(report.inserts, "education", r.count);
  }

  // Highlights depend on the generated experience id, so these are created one
  // experience at a time with a nested write rather than via createMany.
  for (const exp of p.experience) {
    await tx.experience.create({
      data: {
        profileId: p.id,
        title: exp.title,
        organization: exp.organization,
        duration: exp.duration,
        displayOrder: exp.displayOrder,
        highlights: {
          create: exp.highlights.map((h) => ({ body: h.body, displayOrder: h.displayOrder })),
        },
      },
      select: { id: true },
    });
    bump(report.inserts, "experience", 1);
    bump(report.inserts, "experience_highlights", exp.highlights.length);
  }

  if (p.achievements.length > 0) {
    const r = await tx.achievement.createMany({
      data: p.achievements.map((a) => ({ profileId: p.id, ...a })),
    });
    bump(report.inserts, "achievements", r.count);
  }

  if (p.skills.length > 0) {
    const r = await tx.skill.createMany({
      data: p.skills.map((s) => ({
        profileId: p.id,
        category: s.category,
        name: s.name,
        source: s.source as PrismaSkillSource,
        displayOrder: s.displayOrder,
      })),
    });
    bump(report.inserts, "skills", r.count);
  }

  if (p.financeAreas.length > 0) {
    const r = await tx.financeArea.createMany({
      data: p.financeAreas.map((f) => ({ profileId: p.id, ...f })),
    });
    bump(report.inserts, "finance_areas", r.count);
  }

  if (p.technologyFinanceAreas.length > 0) {
    const r = await tx.technologyFinanceArea.createMany({
      data: p.technologyFinanceAreas.map((t) => ({ profileId: p.id, ...t })),
    });
    bump(report.inserts, "technology_finance_areas", r.count);
  }
}

export async function runImport(
  prisma: PrismaClient,
  data: NormalizedData,
  options: ImportOptions = {},
): Promise<ImportReport> {
  const { inScope, scope } = selectProjects(data, options.projectSlugs);
  const includeProfile = options.includeProfile ?? true;

  if (options.dryRun) {
    return planImport(prisma, data, options);
  }

  // Checked before the transaction opens, so a refusal costs nothing and
  // cannot half-apply. See cmsOverwriteRefusal for why this is not a warning.
  if (options.overwriteCmsAuthored !== true) {
    const cmsAuthored = await findCmsAuthored(prisma, inScope.map((p) => p.slug));
    if (cmsAuthored.length > 0) throw new Error(cmsOverwriteRefusal(cmsAuthored));
  }

  const report = emptyReport(scope, false, inScope.map((p) => p.slug));

  await prisma.$transaction(async (tx) => {
    // 1. Drop projects that no longer exist in the source. Only ever on a full
    //    import — during a pilot run the other 12 are legitimately absent.
    if (scope === "full") {
      const sourceSlugs = data.projects.map((p) => p.slug);
      const stale = await tx.project.findMany({
        where: { slug: { notIn: sourceSlugs } },
        select: { slug: true },
      });
      if (stale.length > 0) {
        report.prunedProjects = stale.map((p) => p.slug);
        const r = await tx.project.deleteMany({ where: { slug: { notIn: sourceSlugs } } });
        bump(report.deletions, "projects", r.count);
      }
    }

    // 2. Technology registry first — project_technologies references it, and
    //    the FK is ON DELETE RESTRICT.
    const technologyIds = new Map<string, number>();
    for (const tech of data.technologies) {
      const row = await tx.technology.upsert({
        where: { name: tech.name },
        create: { name: tech.name },
        update: {},
        select: { id: true },
      });
      technologyIds.set(tech.name, row.id);
    }
    bump(report.inserts, "technologies", data.technologies.length);

    // 3. Pass 1 — projects and their non-relational children.
    const projectIds = new Map<string, number>();
    for (const project of inScope) {
      projectIds.set(project.slug, await importProjectRow(tx, project, technologyIds, report));
    }

    // 4. Pass 2 — relationships, once every project row exists and slugs can be
    //    resolved to ids (DATABASE_DESIGN.md §24: "Slugs resolved to internal
    //    IDs at import time"). Relationships are keyed on the *source* project,
    //    so only in-scope sources are touched.
    const sourceIds = [...projectIds.values()];
    if (sourceIds.length > 0) {
      const r = await tx.projectRelationship.deleteMany({
        where: { sourceProjectId: { in: sourceIds } },
      });
      bump(report.deletions, "project_relationships", r.count);
    }

    for (const project of inScope) {
      if (project.relationships.length === 0) continue;
      const sourceId = projectIds.get(project.slug);
      if (sourceId === undefined) continue;

      const rows: { sourceProjectId: number; relatedProjectId: number; note: string; displayOrder: number }[] = [];
      for (const rel of project.relationships) {
        const target = await tx.project.findUnique({
          where: { slug: rel.relatedSlug },
          select: { id: true },
        });
        if (target === null) {
          // Only reachable in a partial import; recorded rather than guessed at.
          report.deferredRelationships.push({ source: project.slug, related: rel.relatedSlug });
          continue;
        }
        rows.push({
          sourceProjectId: sourceId,
          relatedProjectId: target.id,
          note: rel.note,
          displayOrder: rel.displayOrder,
        });
      }
      if (rows.length > 0) {
        const r = await tx.projectRelationship.createMany({ data: rows });
        bump(report.inserts, "project_relationships", r.count);
      }
    }

    // 5. Profile singleton.
    if (includeProfile) {
      await importProfile(tx, data, report);
    }

    // 6. Prune technologies nothing references any more. Full imports only —
    //    after a pilot run most technologies are legitimately unlinked.
    if (scope === "full") {
      const orphans = await tx.technology.findMany({
        where: { projects: { none: {} } },
        select: { id: true, name: true },
      });
      if (orphans.length > 0) {
        report.prunedTechnologies = orphans.map((t) => t.name);
        const r = await tx.technology.deleteMany({
          where: { id: { in: orphans.map((t) => t.id) } },
        });
        bump(report.deletions, "technologies", r.count);
      }
    }
  });

  return report;
}
