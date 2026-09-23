// Database → TypeScript read model.
//
// Reconstructs the exact shapes that content/projects.ts and
// content/resume-data.ts export, from the PostgreSQL replica. Promoted here
// verbatim from scripts/db/compare.ts (Phase 7B-1), where this logic was
// written and proven: `npm run db:verify` reports 13/13 projects and 1/1
// profile byte-for-byte identical to the TypeScript source.
//
// It lives in lib/ now because Phase 7B-2 needs one reconstruction, shared by
// two callers that must never disagree:
//   - scripts/db/compare.ts, which verifies the replica against content/*.ts
//   - (Step 2) the DB-backed repositories the application will read through
// A second copy would let the verifier certify a reconstruction the app does
// not actually use.
//
// ── No `server-only` marker here, deliberately ─────────────────────────────
// This module is imported by scripts/db/, which runs under tsx/Node rather
// than the Next.js bundler — the exact context `server-only` exists to
// reject. The boundary belongs on the *.server.ts repository modules added in
// Step 2: those are what the application imports, and they sit one hop from
// the "use client" components/nav.tsx. Nothing in app/ or components/ imports
// this file.
//
// Direction of travel is one way: content/*.ts → PostgreSQL → these readers.
// Nothing here writes, and nothing here alters a value on the way out.

import type { DatabaseProfile } from "@/lib/content/canonical";
import {
  CATEGORY_MAP,
  EVIDENCE_MAP,
  IMPLEMENTATION_STATUS_MAP,
  METRIC_KIND_MAP,
  STATUS_MAP,
} from "@/lib/content/schema-maps";
import type { PrismaClient } from "@/lib/generated/prisma/client";
import type { Project } from "@/lib/types";

// Inverse of the enum maps in lib/content/schema-maps.ts. Built by inversion
// rather than written out again, so the two can never drift apart.
function invert<K extends string, V extends string>(map: Record<K, V>): Record<V, K> {
  const out = {} as Record<V, K>;
  for (const [k, v] of Object.entries(map) as [K, V][]) out[v] = k;
  return out;
}

const CATEGORY_FROM_DB = invert(CATEGORY_MAP);
const STATUS_FROM_DB = invert(STATUS_MAP);
const EVIDENCE_FROM_DB = invert(EVIDENCE_MAP);
const METRIC_KIND_FROM_DB = invert(METRIC_KIND_MAP);
const IMPLEMENTATION_STATUS_FROM_DB = invert(IMPLEMENTATION_STATUS_MAP);

/**
// ---------------------------------------------------------------------------
// Database → TypeScript shape
// ---------------------------------------------------------------------------

/**
 * Rebuilds `Project` objects from the database, in `display_order` — which the
 * importer set from the position of each project in the source array, so the
 * order of this list must equal the order of content/projects.ts.
 */
export async function readProjectsFromDatabase(prisma: PrismaClient): Promise<Project[]> {
  const rows = await prisma.project.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      alternateNames: { orderBy: { displayOrder: "asc" } },
      metrics: { orderBy: { displayOrder: "asc" } },
      implementationNotes: { orderBy: { displayOrder: "asc" } },
      contentListItems: { orderBy: { displayOrder: "asc" } },
      technologies: {
        orderBy: { displayOrder: "asc" },
        include: { technology: { select: { name: true } } },
      },
      relationshipsAsSource: {
        orderBy: { displayOrder: "asc" },
        include: { relatedProject: { select: { slug: true } } },
      },
    },
  });

  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    alternateNames: row.alternateNames.map((a) => a.name),
    category: CATEGORY_FROM_DB[row.category],
    status: STATUS_FROM_DB[row.status],
    featured: row.featured,
    source: row.source,
    shortDescription: row.shortDescription,
    problem: row.problem ?? undefined,
    approach: row.approach ?? undefined,
    architecture: row.architecture ?? undefined,
    technologies: row.technologies.map((t) => t.technology.name),
    results: row.contentListItems.filter((i) => i.listType === "results").map((i) => i.body),
    metrics: row.metrics.map((m) => ({
      label: m.label,
      value: m.value,
      kind: METRIC_KIND_FROM_DB[m.kind],
      note: m.note ?? undefined,
      source: m.source ?? undefined,
    })),
    githubUrl: row.githubUrl ?? undefined,
    demoUrl: row.demoUrl ?? undefined,
    evidenceStatus: EVIDENCE_FROM_DB[row.evidenceStatus],
    verificationNotes: row.verificationNotes,
    whatIsWorking: row.contentListItems
      .filter((i) => i.listType === "what_is_working")
      .map((i) => i.body),
    whatIsInDevelopment: row.contentListItems
      .filter((i) => i.listType === "what_is_in_development")
      .map((i) => i.body),
    implementationNotes: row.implementationNotes.map((n) => ({
      label: n.label,
      status: IMPLEMENTATION_STATUS_FROM_DB[n.status],
    })),
    relatedTo: row.relationshipsAsSource.map((r) => ({
      slug: r.relatedProject.slug,
      note: r.note,
    })),
  }));
}

export async function readProfileFromDatabase(prisma: PrismaClient): Promise<DatabaseProfile | null> {
  const row = await prisma.profile.findUnique({
    where: { id: 1 },
    include: {
      education: { orderBy: { displayOrder: "asc" } },
      experience: {
        orderBy: { displayOrder: "asc" },
        include: { highlights: { orderBy: { displayOrder: "asc" } } },
      },
      achievements: { orderBy: { displayOrder: "asc" } },
      skills: { orderBy: { displayOrder: "asc" } },
      financeAreas: { orderBy: { displayOrder: "asc" } },
      technologyFinanceAreas: { orderBy: { displayOrder: "asc" } },
    },
  });
  if (row === null) return null;

  // Resume skills were flattened into one running sequence across categories,
  // so grouping by category in first-appearance order rebuilds the original
  // object — including its key order, which JavaScript preserves for string
  // keys.
  const skills: Record<string, string[]> = {};
  for (const skill of row.skills.filter((s) => s.source === "resume")) {
    const category = skill.category ?? "";
    (skills[category] ??= []).push(skill.name);
  }

  return {
    personal: {
      name: row.name,
      location: row.location,
      phone: row.phone,
      email: row.email,
      github: row.githubUrl,
      linkedin: row.linkedinUrl,
      summary: row.summary,
    },
    education: row.education.map((e) => ({
      institution: e.institution,
      degree: e.degree,
      duration: e.duration,
      detail: e.detail ?? null,
    })),
    experience: row.experience.map((x) => ({
      title: x.title,
      organization: x.organization,
      duration: x.duration,
      bullets: x.highlights.map((h) => h.body),
    })),
    achievements: row.achievements.map((a) => ({
      title: a.title,
      context: a.context,
      detail: a.detail,
    })),
    financeAreas: row.financeAreas.map((f) => ({ title: f.title, description: f.description })),
    technologyXFinanceAreas: row.technologyFinanceAreas.map((t) => t.label),
    skills,
    additionalVerifiedSkills: row.skills.filter((s) => s.source === "github").map((s) => s.name),
  };
}
