// Contract tests — database-backed project repository vs the authoritative
// TypeScript content. Requires a live PostgreSQL instance: run with
// `npm run test:db`, not `npm test`.
//
// The claim under test is narrow and important: reading a project through
// lib/repositories/project-repository.server.ts must produce exactly what
// reading it through content/projects.ts produces today. If that holds for all
// 13, switching the application's read path cannot change what a visitor sees.
//
// Comparison uses `canonicalProject` and `diff` from lib/content/canonical.ts
// — the same pure helpers Phase 7B-1 used to certify the replica, already
// covered by unit tests. A second comparison implementation here could
// disagree with the verifier and quietly certify the wrong thing. It also
// handles the one documented representational difference: an optional array
// absent in TypeScript (`whatIsWorking` undefined) and one explicitly empty
// (`results: []`) both come back from the database as `[]`. Raw deep equality
// would fail on 10 of the 13 projects for a difference that renders
// identically.
//
// Read-only: nothing here writes to the database.

import { beforeAll, describe, expect, it } from "vitest";

import {
  featuredProjects as tsFeaturedProjects,
  getProject as tsGetProject,
  projects as tsProjects,
} from "@/content/projects";
import { canonicalProject, diff } from "@/lib/content/canonical";
import {
  getAllProjects,
  getFeaturedProjects,
  getProject,
} from "@/lib/repositories/project-repository.server";
import type { Project } from "@/lib/types";

let dbProjects: Project[];

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. These contract tests need the local portfolio_dev database; run them with `npm run test:db`.",
    );
  }
  dbProjects = await getAllProjects();
});

describe("getAllProjects", () => {
  it("returns exactly the 13 projects in content/projects.ts", () => {
    expect(dbProjects).toHaveLength(tsProjects.length);
    expect(tsProjects).toHaveLength(13);
  });

  it("returns every slug, and no unexpected ones", () => {
    const dbSlugs = new Set(dbProjects.map((p) => p.slug));
    const tsSlugs = new Set(tsProjects.map((p) => p.slug));
    const missing = [...tsSlugs].filter((s) => !dbSlugs.has(s));
    const unexpected = [...dbSlugs].filter((s) => !tsSlugs.has(s));
    expect(missing).toEqual([]);
    expect(unexpected).toEqual([]);
  });

  it("preserves project order exactly", () => {
    // display_order was set from array position at import time, so the two
    // sequences must match element for element — ordering is content here,
    // it drives the order of sections on /projects.
    expect(dbProjects.map((p) => p.slug)).toEqual(tsProjects.map((p) => p.slug));
  });

  it("matches the canonical TypeScript representation, project by project", () => {
    for (const [i, tsProject] of tsProjects.entries()) {
      const differences = diff(
        canonicalProject(tsProject),
        canonicalProject(dbProjects[i]),
        `project:${tsProject.slug}`,
      );
      expect(differences).toEqual([]);
    }
  });

  it("does not contain a project documented as deliberately absent", () => {
    // docs/PROJECT_INVENTORY.md: "Portfolio Optimization & MPT" — "Do not
    // migrate it to the database."
    const haystack = dbProjects.map((p) => `${p.title} ${p.slug}`.toLowerCase());
    expect(haystack.some((t) => t.includes("portfolio optimization"))).toBe(false);
  });
});

describe("getProject", () => {
  it("reconstructs each known project exactly", async () => {
    for (const tsProject of tsProjects) {
      const dbProject = await getProject(tsProject.slug);
      expect(dbProject, `slug ${tsProject.slug} not found`).not.toBeNull();
      const differences = diff(
        canonicalProject(tsProject),
        canonicalProject(dbProject as Project),
        `project:${tsProject.slug}`,
      );
      expect(differences).toEqual([]);
    }
  });

  it("agrees with the TypeScript getProject for every known slug", async () => {
    for (const slug of tsProjects.map((p) => p.slug)) {
      const fromTs = tsGetProject(slug);
      const fromDb = await getProject(slug);
      expect(fromTs).toBeDefined();
      expect(canonicalProject(fromDb as Project)).toEqual(canonicalProject(fromTs as Project));
    }
  });

  it("returns null for an unknown slug rather than falling back to TypeScript", async () => {
    expect(await getProject("no-such-project")).toBeNull();
    expect(await getProject("")).toBeNull();
    // A project deliberately absent from the portfolio must not resolve.
    expect(await getProject("portfolio-optimization-mpt")).toBeNull();
  });
});

describe("getFeaturedProjects", () => {
  it("matches the TypeScript featured filter, in the same order", async () => {
    const dbFeatured = await getFeaturedProjects();
    expect(dbFeatured.map((p) => p.slug)).toEqual(tsFeaturedProjects.map((p) => p.slug));
  });

  it("returns exactly the projects whose featured flag is true", async () => {
    const dbFeatured = await getFeaturedProjects();
    expect(dbFeatured.every((p) => p.featured)).toBe(true);
    expect(dbFeatured).toHaveLength(dbProjects.filter((p) => p.featured).length);
  });

  it("reconstructs each featured project exactly", async () => {
    const dbFeatured = await getFeaturedProjects();
    for (const [i, tsProject] of tsFeaturedProjects.entries()) {
      expect(diff(canonicalProject(tsProject), canonicalProject(dbFeatured[i]))).toEqual([]);
    }
  });
});
