// Database-backed project repository — Phase 7B-2 Step 2.
//
// The future read path. NOT yet imported by any page, component, route, or
// metadata function: lib/repositories/project-repository.ts (synchronous,
// TypeScript-backed) is still what the application reads through. Switching
// consumers over is a later step.
//
// ── Why `server-only` ──────────────────────────────────────────────────────
// components/nav.tsx is a "use client" module that imports the profile
// repository, which means the repository barrel is part of the client bundle
// today. This module sits one import away from that boundary and pulls in
// lib/db.ts, @prisma/client and pg. The marker turns an accidental client
// import into a build-time error instead of a silent server-code leak.
//
// ── Query shape ────────────────────────────────────────────────────────────
// One query per render, not one per lookup. `getAllProjects()` is the only
// function that touches the database; `getProject` and `getFeaturedProjects`
// derive from its result. With 13 projects a single read beats a query per
// slug, and it makes the ordering guarantee trivial — the array is already in
// display_order. React's `cache()` deduplicates the read across everything
// rendered in one request, so a layout, a page and a metadata function asking
// for projects share one round-trip.
//
// ── Errors ─────────────────────────────────────────────────────────────────
// Nothing here catches. A reachable database that fails a query is a bug, and
// masking it with TypeScript content would hide that indefinitely (approved
// policy J-4 case 2). The TypeScript fallback for an *unavailable* database is
// a separate, later step and deliberately absent from this module.

import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/db";
import { readProjectsFromDatabase } from "@/lib/repositories/read-model";
import type { Project } from "@/lib/types";

/**
 * Every project, in `display_order` — the position each project holds in
 * content/projects.ts. Mirrors the `projects` export of the TypeScript
 * repository.
 */
export const getAllProjects = cache(async (): Promise<Project[]> => {
  return readProjectsFromDatabase(prisma);
});

/**
 * One project by slug, or `null` when no such row exists.
 *
 * A missing record is the documented 404 path, not an error condition, and
 * never a reason to fall back to content/projects.ts — falling back would
 * resurrect a project the database no longer has (approved policy J-4 case 3).
 */
export const getProject = cache(async (slug: string): Promise<Project | null> => {
  const projects = await getAllProjects();
  return projects.find((p) => p.slug === slug) ?? null;
});

/**
 * Projects flagged `featured`, in the same order they appear in
 * `getAllProjects()`. Mirrors `featuredProjects` in content/projects.ts,
 * which is `projects.filter((p) => p.featured)`.
 */
export const getFeaturedProjects = cache(async (): Promise<Project[]> => {
  const projects = await getAllProjects();
  return projects.filter((p) => p.featured);
});
