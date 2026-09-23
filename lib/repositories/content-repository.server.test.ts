// Unit tests for the application-facing content repository — Phase 7B-2
// Step 4. Database-free by construction:
//
//   - Explicit `typescript` selection, and every genuine-unavailability path
//     (build-time fallback, production-runtime failure), are exercised
//     against the REAL lib/db.ts with DATABASE_URL left unset. That module
//     throws "DATABASE_URL is not set" before ever constructing a Prisma
//     client or opening a socket, so this is a true "database unavailable"
//     case with no mocking of the classification logic itself.
//
//   - Everything that requires the database to have answered — query
//     failure (Case B), a missing record (Case C), invalid data (Case D),
//     and cross-read consistency once a "connection" is established — mocks
//     lib/repositories/project-repository.server.ts and
//     profile-repository.server.ts directly. Those are exactly the seam the
//     architecture already draws (app -> content-repository -> *.server.ts),
//     so replacing them is replacing a collaborator, not the logic under
//     test.
//
// Each test gets a fresh module instance (`vi.resetModules()`), because
// `getActiveSource()` latches its decision in module-scope state — the same
// property that guarantees source consistency in production would otherwise
// leak a decision from one test into the next.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  featuredProjects as tsFeaturedProjects,
  projects as tsProjects,
} from "@/lib/repositories/project-repository";
import * as tsProfileRepo from "@/lib/repositories/profile-repository";

const PROJECT_SERVER_MODULE = "@/lib/repositories/project-repository.server";
const PROFILE_SERVER_MODULE = "@/lib/repositories/profile-repository.server";

async function freshContentRepository() {
  return import("@/lib/repositories/content-repository.server");
}

function setEnv(vars: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

const ORIGINAL_ENV = {
  CONTENT_SOURCE: process.env.CONTENT_SOURCE,
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PHASE: process.env.NEXT_PHASE,
  DATABASE_URL: process.env.DATABASE_URL,
};

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.doUnmock(PROJECT_SERVER_MODULE);
  vi.doUnmock(PROFILE_SERVER_MODULE);
  setEnv({ CONTENT_SOURCE: undefined, NODE_ENV: "test", NEXT_PHASE: undefined, DATABASE_URL: undefined });
});

afterEach(() => {
  setEnv(ORIGINAL_ENV);
  vi.doUnmock(PROJECT_SERVER_MODULE);
  vi.doUnmock(PROFILE_SERVER_MODULE);
});

describe("explicit typescript selection", () => {
  it("never touches the database modules and returns the TypeScript content unchanged", async () => {
    setEnv({ CONTENT_SOURCE: "typescript" });
    const repo = await freshContentRepository();

    const all = await repo.getAllProjects();
    const featured = await repo.getFeaturedProjects();
    const profile = await repo.getProfile();

    expect(all.map((p) => p.slug)).toEqual(tsProjects.map((p) => p.slug));
    expect(featured.map((p) => p.slug)).toEqual(tsFeaturedProjects.map((p) => p.slug));
    expect(profile.personal.name).toBe(tsProfileRepo.personal.name);
    expect(profile.personal.github).toBe(tsProfileRepo.personal.github);

    const active = await repo.getActiveSource();
    expect(active).toEqual({ source: "typescript", requested: "typescript", fellBack: false });
  });

  it("returns null for an unknown slug, same as the TypeScript repository", async () => {
    setEnv({ CONTENT_SOURCE: "typescript" });
    const repo = await freshContentRepository();
    expect(await repo.getProject("no-such-project")).toBeNull();
  });
});

describe("genuine database unavailability (Case A) — real lib/db.ts, DATABASE_URL unset", () => {
  it("falls back to TypeScript during a static build, loudly, and stays consistent across reads", async () => {
    setEnv({ CONTENT_SOURCE: "database", NODE_ENV: "production", NEXT_PHASE: "phase-production-build" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const repo = await freshContentRepository();

    const active = await repo.getActiveSource();
    expect(active).toEqual({ source: "typescript", requested: "database", fellBack: true });
    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls.some(([msg]) => String(msg).includes("FALLBACK"))).toBe(true);

    // Both projects and profile must land on the same (TypeScript) source —
    // never a database project list paired with a TypeScript profile.
    const all = await repo.getAllProjects();
    const profile = await repo.getProfile();
    expect(all.map((p) => p.slug)).toEqual(tsProjects.map((p) => p.slug));
    expect(profile.personal.name).toBe(tsProfileRepo.personal.name);
  });

  it("fails loudly at production runtime instead of silently serving stale TypeScript content", async () => {
    setEnv({ CONTENT_SOURCE: "database", NODE_ENV: "production" }); // no NEXT_PHASE: not a build
    const repo = await freshContentRepository();
    await expect(repo.getActiveSource()).rejects.toThrow(/Refusing to serve/);
  });

  it("propagates the same rejection to every reader instead of retrying per read", async () => {
    setEnv({ CONTENT_SOURCE: "database", NODE_ENV: "production" });
    const repo = await freshContentRepository();
    await expect(repo.getAllProjects()).rejects.toThrow();
    await expect(repo.getProfile()).rejects.toThrow();
  });

  it("fails loudly in dev-server runtime too — only a static build may fall back", async () => {
    // Only isStaticBuild() (NEXT_PHASE=phase-production-build) authorizes the
    // Case A fallback. A plain `npm run dev` with an explicit database
    // request and no reachable database must fail loudly, not silently swap
    // in TypeScript content behind the developer's back.
    setEnv({ CONTENT_SOURCE: "database", NODE_ENV: "development" });
    const repo = await freshContentRepository();
    await expect(repo.getActiveSource()).rejects.toThrow(/Refusing to serve/);
  });

  it("does not fall back in a test run with an explicit database request either", async () => {
    setEnv({ CONTENT_SOURCE: "database", NODE_ENV: "test" });
    const repo = await freshContentRepository();
    await expect(repo.getActiveSource()).rejects.toThrow(/Refusing to serve/);
  });
});

describe("query failure (Case B) — never falls back", () => {
  async function mockConnectedDatabase(overrides: {
    getAllProjects?: () => Promise<unknown>;
    getProject?: (slug: string) => Promise<unknown>;
    getFeaturedProjects?: () => Promise<unknown>;
  }) {
    vi.doMock(PROJECT_SERVER_MODULE, () => ({
      getAllProjects: overrides.getAllProjects ?? (async () => []),
      getProject: overrides.getProject ?? (async () => null),
      getFeaturedProjects: overrides.getFeaturedProjects ?? (async () => []),
    }));
  }

  it("propagates a query error from getAllProjects as ContentQueryError, not TypeScript", async () => {
    setEnv({ CONTENT_SOURCE: "database" });
    // The probe call succeeds once (source becomes "database"); the second,
    // real call is what fails — proving the failure is classified per-read,
    // not baked into source resolution.
    let calls = 0;
    await mockConnectedDatabase({
      getAllProjects: async () => {
        calls += 1;
        if (calls === 1) return [];
        throw new Error('relation "projects" does not exist');
      },
    });
    const repo = await freshContentRepository();
    await repo.getActiveSource(); // latch as "database" via the successful probe
    await expect(repo.getAllProjects()).rejects.toThrow(/query error/i);
  });

  it("propagates a query error from getProject as ContentQueryError, not TypeScript", async () => {
    setEnv({ CONTENT_SOURCE: "database" });
    await mockConnectedDatabase({
      getProject: async () => {
        throw new Error("syntax error in query");
      },
    });
    const repo = await freshContentRepository();
    await expect(repo.getProject("nist-atdl-compression")).rejects.toThrow(/query error/i);
  });

  it("propagates a query error from the profile read as ContentQueryError", async () => {
    setEnv({ CONTENT_SOURCE: "database" });
    await mockConnectedDatabase({});
    vi.doMock(PROFILE_SERVER_MODULE, () => ({
      getProfile: async () => {
        throw new Error("connection reset mid-statement, but not a recognized unavailability code");
      },
    }));
    const repo = await freshContentRepository();
    await expect(repo.getProfile()).rejects.toThrow(/query error/i);
  });

  it("does not reclassify a mid-read disconnect as anything other than unavailable-mid-render", async () => {
    // Once the source has already resolved to "database" for this render,
    // a read that fails with a *genuine* unavailability signal must not
    // silently swap back to TypeScript mid-render — it fails loudly instead,
    // to avoid mixing sources in one response.
    setEnv({ CONTENT_SOURCE: "database" });
    await mockConnectedDatabase({
      getProject: async () => {
        const err = new Error("connection lost") as Error & { code: string };
        err.code = "ECONNRESET";
        throw err;
      },
    });
    const repo = await freshContentRepository();
    await expect(repo.getProject("nist-atdl-compression")).rejects.toThrow(/became unavailable/i);
  });
});

describe("missing record (Case C)", () => {
  it("returns null for an unknown slug and lets the route 404, without resurrecting TypeScript", async () => {
    setEnv({ CONTENT_SOURCE: "database" });
    vi.doMock(PROJECT_SERVER_MODULE, () => ({
      getAllProjects: async () => [],
      getProject: async () => null,
      getFeaturedProjects: async () => [],
    }));
    const repo = await freshContentRepository();
    expect(await repo.getProject("no-such-project")).toBeNull();
  });
});

describe("invalid data (Case D)", () => {
  it("throws InvalidContentError for a malformed database profile, without falling back", async () => {
    setEnv({ CONTENT_SOURCE: "database" });
    vi.doMock(PROJECT_SERVER_MODULE, () => ({
      getAllProjects: async () => [],
      getProject: async () => null,
      getFeaturedProjects: async () => [],
    }));
    vi.doMock(PROFILE_SERVER_MODULE, () => ({
      getProfile: async () => ({
        personal: { name: 12345 }, // wrong type: should be a string
        education: [],
        experience: [],
        achievements: [],
        financeAreas: [],
        technologyXFinanceAreas: [],
        skills: {},
        additionalVerifiedSkills: [],
      }),
    }));
    const repo = await freshContentRepository();
    await expect(repo.getProfile()).rejects.toThrow(/profile\.personal\.name/);
  });

  it("throws for an absent profile row rather than fabricating one", async () => {
    setEnv({ CONTENT_SOURCE: "database" });
    vi.doMock(PROJECT_SERVER_MODULE, () => ({
      getAllProjects: async () => [],
      getProject: async () => null,
      getFeaturedProjects: async () => [],
    }));
    vi.doMock(PROFILE_SERVER_MODULE, () => ({ getProfile: async () => null }));
    const repo = await freshContentRepository();
    await expect(repo.getProfile()).rejects.toThrow(/profile\.id = 1 is absent/);
  });
});

describe("source consistency", () => {
  it("resolves the source exactly once per process and reuses it for every subsequent read", async () => {
    setEnv({ CONTENT_SOURCE: "database" });
    let probeCalls = 0;
    vi.doMock(PROJECT_SERVER_MODULE, () => ({
      getAllProjects: async () => {
        probeCalls += 1;
        return [];
      },
      getProject: async () => null,
      getFeaturedProjects: async () => {
        probeCalls += 1;
        return [];
      },
    }));
    vi.doMock(PROFILE_SERVER_MODULE, () => ({
      getProfile: async () => ({
        personal: {
          name: "x", location: "x", phone: "x", email: "x", github: "x", linkedin: "x", summary: "x",
        },
        education: [], experience: [], achievements: [], financeAreas: [],
        technologyXFinanceAreas: [], skills: {}, additionalVerifiedSkills: [],
      }),
    }));
    const repo = await freshContentRepository();

    // Concurrent callers must not each re-run resolution independently.
    const [a1, a2, a3] = await Promise.all([repo.getActiveSource(), repo.getActiveSource(), repo.getActiveSource()]);
    expect(a1).toBe(a2);
    expect(a2).toBe(a3);
    expect(probeCalls).toBe(1);

    await repo.getAllProjects();
    await repo.getFeaturedProjects();
    await repo.getProfile();
    // The probe consumed one call; getAllProjects() and getFeaturedProjects()
    // each make their own real read after that — three total, never a
    // second *resolution* of which source to use.
    expect(probeCalls).toBe(3);
  });

  it("a build-time fallback decision is not re-evaluated per read within the same process", async () => {
    setEnv({ CONTENT_SOURCE: "database", NODE_ENV: "production", NEXT_PHASE: "phase-production-build" });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const repo = await freshContentRepository();

    const first = await repo.getActiveSource();
    const second = await repo.getActiveSource();
    expect(first).toBe(second);
    expect(first.fellBack).toBe(true);

    // Both reads land on TypeScript, consistently, without re-probing.
    const profile = await repo.getProfile();
    expect(profile.personal.name).toBe(tsProfileRepo.personal.name);
  });
});
