// The public projection — the boundary that keeps internal fields off the
// public site.
//
// Today exactly one field is internal: `verificationNotes`. It is the editorial
// record of what was actually checked — which repositories could not be found,
// which numbers are the owner's word rather than a measurement, which claims
// are still unverified. That is a note to the author, not copy for a visitor,
// and it was previously rendered on every public project page.
//
// ── Why a projection function and not just a type ──────────────────────────
// `PublicProject` being `Omit<Project, "verificationNotes">` stops a page
// *reading* the field. It does not stop the field travelling: hand a Server
// Component a full `Project` and React serializes the whole object into the
// RSC flight payload, which ships to the browser inside the HTML response.
// The field would be absent from the rendered text and present in the page
// source. So the value has to be removed from the object, not just from the
// type.
//
// ── Why an explicit field list, not `{ verificationNotes, ...rest }` ───────
// Rest-spread is deny-one: it drops the field named today and silently
// forwards every field added tomorrow, including the next internal one. An
// explicit list is allow-only. It cannot silently *drop* a legitimate public
// field either, because `PublicProject` requires every one of them — leaving
// one out is a type error, not a missing section on a live page.
//
// Pure and dependency-free, so `npm test` covers it without a database.

import type { Project, PublicProject } from "@/lib/types";

/**
 * Strip internal fields from a project.
 *
 * Every public read funnels through here. Adding a field to `Project` that is
 * safe to publish means adding it below; the compiler insists.
 */
export function toPublicProject(project: Project): PublicProject {
  return {
    slug: project.slug,
    title: project.title,
    alternateNames: project.alternateNames,
    category: project.category,
    status: project.status,
    featured: project.featured,
    shortDescription: project.shortDescription,
    problem: project.problem,
    approach: project.approach,
    architecture: project.architecture,
    technologies: project.technologies,
    results: project.results,
    metrics: project.metrics,
    githubUrl: project.githubUrl,
    demoUrl: project.demoUrl,
    evidenceStatus: project.evidenceStatus,
    whatIsWorking: project.whatIsWorking,
    whatIsInDevelopment: project.whatIsInDevelopment,
    implementationNotes: project.implementationNotes,
    relatedTo: project.relatedTo,
    source: project.source,
  };
}

/** Convenience for the list reads. */
export function toPublicProjects(projects: readonly Project[]): PublicProject[] {
  return projects.map(toPublicProject);
}

/**
 * The project as the article component takes it: public fields, minus the raw
 * relationship list.
 *
 * `relatedTo` names every project this one points at, whether or not the
 * viewer may see those projects. The article renders a separate, already
 * resolved and filtered `related` prop, so carrying the raw list would
 * serialize unpublished slugs into the page without displaying them.
 *
 * Unlike `toPublicProject`, this is written as a narrowing of an
 * already-projected object rather than an allow-list. It is not the trust
 * boundary — `toPublicProject` is, and it runs first — so the deny-by-default
 * argument does not apply here; what matters is only that `relatedTo` is gone
 * at runtime, not just from the type.
 */
export function stripRelationships<T extends { relatedTo?: unknown }>(
  project: T,
): Omit<T, "relatedTo"> {
  const copy = { ...project };
  delete copy.relatedTo;
  return copy;
}
