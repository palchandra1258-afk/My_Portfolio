// Phase 7B-1 — Normalize.
//
// Converts the authoritative TypeScript content (content/projects.ts,
// content/resume-data.ts) into database-shaped records, without changing a
// single content value. Pure: no database access, no I/O, no side effects —
// so it can be unit-tested on its own.
//
// TypeScript content remains the source of truth; the database is a derived
// replica (docs/PORTFOLIO_ARCHITECTURE.md §13, IMPLEMENTATION_ROADMAP.md §26).
//
// Two things are *derived* here rather than read from source, both required by
// the approved design:
//   - `displayOrder`, from array position (CMS_SPECIFICATION.md §23 forbids
//     relying on insertion order once content lives in a database)
//   - Prisma enum identifiers, mapped from the TypeScript string unions
//     (e.g. "coming-soon" -> coming_soon). The DB still stores the original
//     string via @map, so no value is altered.

import { projects } from "@/content/projects";
import {
  achievements,
  additionalVerifiedSkills,
  education,
  experience,
  financeAreas,
  personal,
  skills,
  technologyXFinanceAreas,
} from "@/content/resume-data";

// The schema vocabulary (TypeScript union <-> Prisma enum identifier) lives in
// lib/ so that lib/repositories/read-model.ts does not have to import from
// scripts/. Re-exported below, unchanged, because the rest of scripts/db/
// reads it through this module.
import { type RowCountManifest } from "@/lib/content/canonical";
import {
  CATEGORY_MAP,
  EVIDENCE_MAP,
  IMPLEMENTATION_STATUS_MAP,
  METRIC_KIND_MAP,
  STATUS_MAP,
  type PrismaContentListType,
  type PrismaImplementationStatus,
  type PrismaMetricStatus,
  type PrismaProjectCategory,
  type PrismaProjectSource,
  type PrismaProjectStatus,
  type PrismaSkillSource,
  type PrismaVerificationStatus,
} from "@/lib/content/schema-maps";

export { type RowCountManifest };

export {
  CATEGORY_MAP,
  EVIDENCE_MAP,
  IMPLEMENTATION_STATUS_MAP,
  METRIC_KIND_MAP,
  STATUS_MAP,
  type PrismaContentListType,
  type PrismaImplementationStatus,
  type PrismaMetricStatus,
  type PrismaProjectCategory,
  type PrismaProjectSource,
  type PrismaProjectStatus,
  type PrismaSkillSource,
  type PrismaVerificationStatus,
};


export interface NormalizedAlternateName {
  name: string;
  displayOrder: number;
}

export interface NormalizedTechnologyRef {
  name: string;
  displayOrder: number;
}

export interface NormalizedMetric {
  label: string;
  value: string;
  kind: PrismaMetricStatus;
  note: string | null;
  source: string | null;
  displayOrder: number;
}

export interface NormalizedImplementationNote {
  label: string;
  status: PrismaImplementationStatus;
  displayOrder: number;
}

export interface NormalizedContentListItem {
  listType: PrismaContentListType;
  body: string;
  displayOrder: number;
}

/** Relationship target is kept as a slug here; the importer resolves it to an internal id in pass 2. */
export interface NormalizedRelationship {
  relatedSlug: string;
  note: string;
  displayOrder: number;
}

export interface NormalizedProject {
  slug: string;
  title: string;
  shortDescription: string;
  problem: string | null;
  approach: string | null;
  architecture: string | null;
  category: PrismaProjectCategory;
  status: PrismaProjectStatus;
  evidenceStatus: PrismaVerificationStatus;
  verificationNotes: string;
  featured: boolean;
  source: PrismaProjectSource;
  githubUrl: string | null;
  demoUrl: string | null;
  displayOrder: number;
  alternateNames: NormalizedAlternateName[];
  technologies: NormalizedTechnologyRef[];
  metrics: NormalizedMetric[];
  implementationNotes: NormalizedImplementationNote[];
  contentListItems: NormalizedContentListItem[];
  relationships: NormalizedRelationship[];
}

export interface NormalizedSkill {
  category: string | null;
  name: string;
  source: PrismaSkillSource;
  displayOrder: number;
}

export interface NormalizedProfile {
  id: 1;
  name: string;
  location: string;
  phone: string;
  email: string;
  githubUrl: string;
  linkedinUrl: string;
  summary: string;
  education: { institution: string; degree: string; duration: string; detail: string | null; displayOrder: number }[];
  experience: {
    title: string;
    organization: string;
    duration: string;
    displayOrder: number;
    highlights: { body: string; displayOrder: number }[];
  }[];
  achievements: { title: string; context: string; detail: string; displayOrder: number }[];
  skills: NormalizedSkill[];
  financeAreas: { title: string; description: string; displayOrder: number }[];
  technologyFinanceAreas: { label: string; displayOrder: number }[];
}

/** Canonical technology registry: one row per distinct technology name. */
export interface NormalizedTechnology {
  name: string;
}

export interface NormalizedData {
  projects: NormalizedProject[];
  technologies: NormalizedTechnology[];
  profile: NormalizedProfile;
  manifest: RowCountManifest;
  /** Distinct technology names keyed by lowercase, for case-collision detection. */
  technologyCaseIndex: Map<string, string[]>;
}

function normalizeProject(project: (typeof projects)[number], index: number): NormalizedProject {
  const contentListItems: NormalizedContentListItem[] = [];
  // Order matters and is preserved per list; the three lists are independent
  // sequences distinguished by listType (DATABASE_DESIGN.md §11).
  (project.results ?? []).forEach((body, i) =>
    contentListItems.push({ listType: "results", body, displayOrder: i }),
  );
  (project.whatIsWorking ?? []).forEach((body, i) =>
    contentListItems.push({ listType: "what_is_working", body, displayOrder: i }),
  );
  (project.whatIsInDevelopment ?? []).forEach((body, i) =>
    contentListItems.push({ listType: "what_is_in_development", body, displayOrder: i }),
  );

  return {
    slug: project.slug,
    title: project.title,
    shortDescription: project.shortDescription,
    problem: project.problem ?? null,
    approach: project.approach ?? null,
    architecture: project.architecture ?? null,
    category: CATEGORY_MAP[project.category],
    status: STATUS_MAP[project.status],
    evidenceStatus: EVIDENCE_MAP[project.evidenceStatus],
    verificationNotes: project.verificationNotes,
    featured: project.featured,
    source: project.source,
    githubUrl: project.githubUrl ?? null,
    demoUrl: project.demoUrl ?? null,
    displayOrder: index,
    alternateNames: (project.alternateNames ?? []).map((name, i) => ({ name, displayOrder: i })),
    technologies: project.technologies.map((name, i) => ({ name, displayOrder: i })),
    metrics: project.metrics.map((m, i) => ({
      label: m.label,
      value: m.value,
      kind: METRIC_KIND_MAP[m.kind],
      note: m.note ?? null,
      source: m.source ?? null,
      displayOrder: i,
    })),
    implementationNotes: (project.implementationNotes ?? []).map((n, i) => ({
      label: n.label,
      status: IMPLEMENTATION_STATUS_MAP[n.status],
      displayOrder: i,
    })),
    contentListItems,
    relationships: (project.relatedTo ?? []).map((r, i) => ({
      relatedSlug: r.slug,
      note: r.note,
      displayOrder: i,
    })),
  };
}

function normalizeProfile(): NormalizedProfile {
  const normalizedSkills: NormalizedSkill[] = [];

  // Resume skills: a single running sequence across categories, iterated in
  // declaration order, so the original grouping and ordering is reconstructable.
  let resumeOrder = 0;
  for (const [category, names] of Object.entries(skills)) {
    for (const name of names) {
      normalizedSkills.push({ category, name, source: "resume", displayOrder: resumeOrder++ });
    }
  }

  // GitHub-verified skills are a distinct list with no category — the
  // provenance distinction is load-bearing and must survive (content/resume-data.ts).
  additionalVerifiedSkills.forEach((name, i) => {
    normalizedSkills.push({ category: null, name, source: "github", displayOrder: i });
  });

  return {
    id: 1,
    name: personal.name,
    location: personal.location,
    phone: personal.phone,
    email: personal.email,
    githubUrl: personal.github,
    linkedinUrl: personal.linkedin,
    summary: personal.summary,
    education: education.map((e, i) => ({
      institution: e.institution,
      degree: e.degree,
      duration: e.duration,
      detail: e.detail ?? null,
      displayOrder: i,
    })),
    experience: experience.map((x, i) => ({
      title: x.title,
      organization: x.organization,
      duration: x.duration,
      displayOrder: i,
      highlights: x.bullets.map((body, j) => ({ body, displayOrder: j })),
    })),
    achievements: achievements.map((a, i) => ({
      title: a.title,
      context: a.context,
      detail: a.detail,
      displayOrder: i,
    })),
    skills: normalizedSkills,
    financeAreas: financeAreas.map((f, i) => ({
      title: f.title,
      description: f.description,
      displayOrder: i,
    })),
    technologyFinanceAreas: technologyXFinanceAreas.map((label, i) => ({ label, displayOrder: i })),
  };
}

export function normalize(): NormalizedData {
  const normalizedProjects = projects.map(normalizeProject);
  const normalizedProfile = normalizeProfile();

  // Technology registry: deduplicated by exact name, first-seen order.
  // A parallel lowercase index lets validation flag case-variant duplicates
  // (e.g. "Python" vs "python") rather than silently collapsing them.
  const technologyNames: string[] = [];
  const seen = new Set<string>();
  const technologyCaseIndex = new Map<string, string[]>();

  for (const project of normalizedProjects) {
    for (const tech of project.technologies) {
      if (!seen.has(tech.name)) {
        seen.add(tech.name);
        technologyNames.push(tech.name);
      }
      const key = tech.name.toLowerCase();
      const variants = technologyCaseIndex.get(key) ?? [];
      if (!variants.includes(tech.name)) {
        variants.push(tech.name);
        technologyCaseIndex.set(key, variants);
      }
    }
  }

  const sum = <T>(items: T[], f: (item: T) => number) => items.reduce((acc, i) => acc + f(i), 0);

  const manifest: RowCountManifest = {
    projects: normalizedProjects.length,
    project_alternate_names: sum(normalizedProjects, (p) => p.alternateNames.length),
    project_metrics: sum(normalizedProjects, (p) => p.metrics.length),
    project_implementation_notes: sum(normalizedProjects, (p) => p.implementationNotes.length),
    project_content_list_items: sum(normalizedProjects, (p) => p.contentListItems.length),
    project_relationships: sum(normalizedProjects, (p) => p.relationships.length),
    project_technologies: sum(normalizedProjects, (p) => p.technologies.length),
    technologies: technologyNames.length,
    profile: 1,
    education: normalizedProfile.education.length,
    experience: normalizedProfile.experience.length,
    experience_highlights: sum(normalizedProfile.experience, (x) => x.highlights.length),
    achievements: normalizedProfile.achievements.length,
    skills: normalizedProfile.skills.length,
    finance_areas: normalizedProfile.financeAreas.length,
    technology_finance_areas: normalizedProfile.technologyFinanceAreas.length,
  };

  return {
    projects: normalizedProjects,
    technologies: technologyNames.map((name) => ({ name })),
    profile: normalizedProfile,
    manifest,
    technologyCaseIndex,
  };
}
