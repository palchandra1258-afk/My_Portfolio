// Tests for the project server actions — Phase 7.
//
// A Server Action is a separately addressable HTTP endpoint. It is reachable
// without ever loading the page that renders the form, so its own
// authorization check is the only thing standing between an anonymous POST and
// a database write. These tests assert that check fires first — before the
// input is parsed and long before anything is written
// (SECURITY_AND_QUALITY.md §6, ADMIN_DASHBOARD_SPECIFICATION.md §89).
//
// The repository is mocked: it imports lib/db.ts, which throws without
// DATABASE_URL by design, and `npm test` must stay runnable with no
// PostgreSQL. The error classes are defined inside the mock factory, so the
// `instanceof` checks in the action resolve against the same class objects the
// tests throw — the action and the test import from the same mocked module.
// The real transactional behaviour is covered by
// lib/repositories/admin-project-repository.db.test.ts under `npm run test:db`.

import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAuthorized = vi.fn();
const createProject = vi.fn();
const updateProject = vi.fn();
const setPublicationStatus = vi.fn();
const restoreProjectRevision = vi.fn();
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
  revalidatePath: (path: string) => revalidatePath(path),
}));

vi.mock("next/navigation", () => ({
  // The real `redirect()` throws to unwind the render, and the action relies
  // on that: any code after it must not run.
  redirect: (location: string) => {
    throw new RedirectSignal(location);
  },
}));

vi.mock("@/lib/repositories/admin-project-repository.server", () => {
  class DuplicateSlugError extends Error {
    constructor(public readonly slug: string) {
      super(`duplicate ${slug}`);
      this.name = "DuplicateSlugError";
    }
  }
  class ProjectNotFoundError extends Error {
    constructor(public readonly slug: string) {
      super(`missing ${slug}`);
      this.name = "ProjectNotFoundError";
    }
  }
  class RevisionNotFoundError extends Error {
    constructor(
      public readonly slug: string,
      public readonly revisionId: number,
    ) {
      super(`missing revision ${revisionId} for ${slug}`);
      this.name = "RevisionNotFoundError";
    }
  }
  class InvalidRevisionError extends Error {
    constructor(public readonly errors: Record<string, string>) {
      super("invalid revision");
      this.name = "InvalidRevisionError";
    }
  }
  return {
    DuplicateSlugError,
    InvalidRevisionError,
    ProjectNotFoundError,
    RevisionNotFoundError,
    createProject: (values: unknown) => createProject(values),
    updateProject: (slug: string, values: unknown) => updateProject(slug, values),
    setPublicationStatus: (slug: string, status: string) => setPublicationStatus(slug, status),
    restoreProjectRevision: (slug: string, revisionId: number, context: unknown) =>
      restoreProjectRevision(slug, revisionId, context),
  };
});

const ACTIONS = "@/app/admin/(dashboard)/projects/actions";
const REPO = "@/lib/repositories/admin-project-repository.server";

const EMPTY = { errors: {}, message: null };

function form(overrides: Record<string, string> = {}, omit: string[] = []): FormData {
  const base: Record<string, string> = {
    originalSlug: "example-project",
    slug: "example-project",
    title: "Example Project",
    shortDescription: "A short description.",
    verificationNotes: "Checked the repository.",
    category: "supporting",
    status: "Completed",
    source: "GitHub",
    evidenceStatus: "self-reported",
    publicationStatus: "draft",
    technologies: "TypeScript",
    githubUrl: "",
    demoUrl: "",
    displayOrder: "3",
    ...overrides,
  };
  const data = new FormData();
  for (const [key, value] of Object.entries(base)) {
    if (omit.includes(key)) continue;
    data.set(key, value);
  }
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
  createProject.mockResolvedValue({ id: 1, slug: "example-project" });
  updateProject.mockResolvedValue({ id: 1, slug: "example-project" });
  setPublicationStatus.mockResolvedValue({
    slug: "example-project",
    status: "published",
    publishedAt: new Date("2026-01-01T00:00:00Z"),
    firstPublish: true,
  });
});

// ---------------------------------------------------------------------------

describe("createProjectAction — authorization", () => {
  it("refuses an unauthenticated caller", async () => {
    signedOut();
    const { createProjectAction } = await import(ACTIONS);

    await expect(createProjectAction(EMPTY, form())).rejects.toBeInstanceOf(RedirectSignal);
    expect(createProject).not.toHaveBeenCalled();
  });

  it("authorizes before parsing, so a hostile payload is never even read", async () => {
    signedOut();
    const { createProjectAction } = await import(ACTIONS);

    await expect(
      createProjectAction(EMPTY, form({ slug: "../../etc/passwd", title: "x".repeat(10_000) })),
    ).rejects.toBeInstanceOf(RedirectSignal);
    expect(createProject).not.toHaveBeenCalled();
  });
});

describe("createProjectAction — validation", () => {
  it("rejects an invalid submission without writing", async () => {
    signedIn();
    const { createProjectAction } = await import(ACTIONS);

    const state = await createProjectAction(EMPTY, form({ title: "", slug: "Bad Slug" }));
    expect(state.errors.title).toBeDefined();
    expect(state.errors.slug).toBeDefined();
    expect(state.message).toMatch(/nothing was saved/i);
    expect(createProject).not.toHaveBeenCalled();
  });

  it("re-validates server-side even though the browser already did", async () => {
    signedIn();
    const { createProjectAction } = await import(ACTIONS);

    // `required` and `pattern` in the markup cannot stop this request.
    const state = await createProjectAction(EMPTY, form({ evidenceStatus: "totally-verified" }));
    expect(state.errors.evidenceStatus).toBeDefined();
    expect(createProject).not.toHaveBeenCalled();
  });
});

describe("createProjectAction — success", () => {
  it("writes the parsed values and redirects to the new project", async () => {
    signedIn();
    const { createProjectAction } = await import(ACTIONS);

    await expect(createProjectAction(EMPTY, form())).rejects.toMatchObject({
      location: "/admin/projects/example-project?saved=created",
    });

    expect(createProject).toHaveBeenCalledTimes(1);
    const [written] = createProject.mock.calls[0];
    expect(written).toMatchObject({
      slug: "example-project",
      title: "Example Project",
      publicationStatus: "draft",
      technologies: ["TypeScript"],
    });
  });

  it("revalidates the public pages the project appears on", async () => {
    signedIn();
    const { createProjectAction } = await import(ACTIONS);

    await expect(createProjectAction(EMPTY, form())).rejects.toBeInstanceOf(RedirectSignal);

    const paths = revalidatePath.mock.calls.map(([p]) => p);
    expect(paths).toContain("/");
    expect(paths).toContain("/projects");
    expect(paths).toContain("/projects/example-project");
    expect(paths).toContain("/sitemap.xml");
  });
});

describe("createProjectAction — duplicate slug", () => {
  it("reports the collision on the slug field rather than crashing", async () => {
    signedIn();
    const { DuplicateSlugError } = await import(REPO);
    createProject.mockRejectedValue(new DuplicateSlugError("example-project"));
    const { createProjectAction } = await import(ACTIONS);

    const state = await createProjectAction(EMPTY, form());
    expect(state.errors.slug).toMatch(/already used/i);
    expect(state.message).toMatch(/nothing was saved/i);
  });

  it("lets an unexpected repository failure propagate instead of reporting a save", async () => {
    // Swallowing this would tell the operator the project saved when it did not.
    signedIn();
    createProject.mockRejectedValue(new Error("connection reset"));
    const { createProjectAction } = await import(ACTIONS);

    await expect(createProjectAction(EMPTY, form())).rejects.toThrow("connection reset");
  });
});

describe("updateProjectAction", () => {
  it("refuses an unauthenticated caller", async () => {
    signedOut();
    const { updateProjectAction } = await import(ACTIONS);

    await expect(updateProjectAction(EMPTY, form())).rejects.toBeInstanceOf(RedirectSignal);
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("refuses a submission that does not say which project it edited", async () => {
    signedIn();
    const { updateProjectAction } = await import(ACTIONS);

    const state = await updateProjectAction(EMPTY, form({}, ["originalSlug"]));
    expect(state.message).toMatch(/missing the project/i);
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("updates the project identified by originalSlug", async () => {
    signedIn();
    const { updateProjectAction } = await import(ACTIONS);

    await expect(updateProjectAction(EMPTY, form())).rejects.toMatchObject({
      location: "/admin/projects/example-project?saved=updated",
    });
    expect(updateProject).toHaveBeenCalledTimes(1);
    expect(updateProject.mock.calls[0][0]).toBe("example-project");
  });

  it("revalidates the previous URL as well when the slug changes", async () => {
    signedIn();
    updateProject.mockResolvedValue({ id: 1, slug: "renamed-project" });
    const { updateProjectAction } = await import(ACTIONS);

    await expect(
      updateProjectAction(EMPTY, form({ originalSlug: "example-project", slug: "renamed-project" })),
    ).rejects.toBeInstanceOf(RedirectSignal);

    const paths = revalidatePath.mock.calls.map(([p]) => p);
    // Without this the old URL keeps serving a cached page that no longer exists.
    expect(paths).toContain("/projects/example-project");
    expect(paths).toContain("/projects/renamed-project");
  });

  it("rejects an invalid edit without writing", async () => {
    signedIn();
    const { updateProjectAction } = await import(ACTIONS);

    const state = await updateProjectAction(EMPTY, form({ shortDescription: "" }));
    expect(state.errors.shortDescription).toBeDefined();
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("persists cleared verification notes instead of rejecting the save", async () => {
    // The notes are internal and optional. Submitting an empty field is how
    // the admin removes them, and it must reach the database as "" rather
    // than being treated as a validation failure or silently skipped.
    signedIn();
    const { updateProjectAction } = await import(ACTIONS);

    await expect(
      updateProjectAction(EMPTY, form({ verificationNotes: "" })),
    ).rejects.toBeInstanceOf(RedirectSignal);

    expect(updateProject).toHaveBeenCalledTimes(1);
    expect(updateProject.mock.calls[0][1]).toMatchObject({ verificationNotes: "" });
  });

  it("passes edited verification notes through to the write layer", async () => {
    signedIn();
    const { updateProjectAction } = await import(ACTIONS);
    const notes = "Repo confirmed. Throughput [NEEDS VERIFICATION].";

    await expect(
      updateProjectAction(EMPTY, form({ verificationNotes: notes })),
    ).rejects.toBeInstanceOf(RedirectSignal);

    expect(updateProject.mock.calls[0][1]).toMatchObject({ verificationNotes: notes });
  });

  it("refuses to touch verification notes for an unauthenticated caller", async () => {
    signedOut();
    const { updateProjectAction } = await import(ACTIONS);

    await expect(
      updateProjectAction(EMPTY, form({ verificationNotes: "attacker rewrite" })),
    ).rejects.toBeInstanceOf(RedirectSignal);
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("reports a slug collision on the field", async () => {
    signedIn();
    const { DuplicateSlugError } = await import(REPO);
    updateProject.mockRejectedValue(new DuplicateSlugError("taken-slug"));
    const { updateProjectAction } = await import(ACTIONS);

    const state = await updateProjectAction(EMPTY, form({ slug: "taken-slug" }));
    expect(state.errors.slug).toMatch(/already used/i);
  });

  it("reports a project that disappeared rather than silently creating one", async () => {
    signedIn();
    const { ProjectNotFoundError } = await import(REPO);
    updateProject.mockRejectedValue(new ProjectNotFoundError("example-project"));
    const { updateProjectAction } = await import(ACTIONS);

    const state = await updateProjectAction(EMPTY, form());
    expect(state.message).toMatch(/no longer exists/i);
    expect(createProject).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Publish / unpublish
// ---------------------------------------------------------------------------

function publishForm(slug = "example-project"): FormData {
  const data = new FormData();
  data.set("slug", slug);
  return data;
}

describe("publishProjectAction", () => {
  it("refuses an unauthenticated caller before touching the database", async () => {
    // These endpoints are directly addressable. A POST straight at them, with
    // no session, must not be able to put content on the public site.
    signedOut();
    const { publishProjectAction } = await import(ACTIONS);

    await expect(publishProjectAction(EMPTY, publishForm())).rejects.toBeInstanceOf(
      RedirectSignal,
    );
    expect(setPublicationStatus).not.toHaveBeenCalled();
  });

  it("publishes exactly the named project", async () => {
    signedIn();
    const { publishProjectAction } = await import(ACTIONS);

    await expect(publishProjectAction(EMPTY, publishForm("the-inevitable"))).rejects.toMatchObject(
      { location: "/admin/projects/example-project?saved=published" },
    );

    expect(setPublicationStatus).toHaveBeenCalledTimes(1);
    expect(setPublicationStatus).toHaveBeenCalledWith("the-inevitable", "published");
  });

  it("revalidates the public pages so the project actually appears", async () => {
    signedIn();
    const { publishProjectAction } = await import(ACTIONS);

    await expect(publishProjectAction(EMPTY, publishForm())).rejects.toBeInstanceOf(
      RedirectSignal,
    );

    const paths = revalidatePath.mock.calls.map(([p]) => p);
    expect(paths).toContain("/");
    expect(paths).toContain("/projects");
    expect(paths).toContain("/sitemap.xml");
  });

  it("reports a missing slug instead of guessing which project was meant", async () => {
    signedIn();
    const { publishProjectAction } = await import(ACTIONS);

    const state = await publishProjectAction(EMPTY, new FormData());
    expect(state.message).toMatch(/did not say which project/i);
    expect(setPublicationStatus).not.toHaveBeenCalled();
  });

  it("handles a project that no longer exists safely", async () => {
    signedIn();
    const { ProjectNotFoundError } = await import(REPO);
    setPublicationStatus.mockRejectedValue(new ProjectNotFoundError("gone"));
    const { publishProjectAction } = await import(ACTIONS);

    const state = await publishProjectAction(EMPTY, publishForm("gone"));
    expect(state.message).toMatch(/no longer exists/i);
  });

  it("lets an unexpected failure propagate rather than reporting a publish", async () => {
    signedIn();
    setPublicationStatus.mockRejectedValue(new Error("connection reset"));
    const { publishProjectAction } = await import(ACTIONS);

    await expect(publishProjectAction(EMPTY, publishForm())).rejects.toThrow("connection reset");
  });
});

describe("unpublishProjectAction", () => {
  it("refuses an unauthenticated caller", async () => {
    signedOut();
    const { unpublishProjectAction } = await import(ACTIONS);

    await expect(unpublishProjectAction(EMPTY, publishForm())).rejects.toBeInstanceOf(
      RedirectSignal,
    );
    expect(setPublicationStatus).not.toHaveBeenCalled();
  });

  it("sets draft, not archived, so the project stays recoverable", async () => {
    // §46: unpublishing removes content from the site without deleting it.
    signedIn();
    setPublicationStatus.mockResolvedValue({
      slug: "example-project",
      status: "draft",
      publishedAt: new Date("2026-01-01T00:00:00Z"),
      firstPublish: false,
    });
    const { unpublishProjectAction } = await import(ACTIONS);

    await expect(unpublishProjectAction(EMPTY, publishForm())).rejects.toMatchObject({
      location: "/admin/projects/example-project?saved=unpublished",
    });
    expect(setPublicationStatus).toHaveBeenCalledWith("example-project", "draft");
  });

  it("changes only the named project", async () => {
    signedIn();
    const { unpublishProjectAction } = await import(ACTIONS);

    await expect(unpublishProjectAction(EMPTY, publishForm("atdl-assignment"))).rejects.toBeInstanceOf(
      RedirectSignal,
    );
    expect(setPublicationStatus).toHaveBeenCalledTimes(1);
    expect(setPublicationStatus.mock.calls[0][0]).toBe("atdl-assignment");
  });
});

// ---------------------------------------------------------------------------
// Restore (CMS_SPECIFICATION.md §49, ADMIN_DASHBOARD_SPECIFICATION.md §59)
// ---------------------------------------------------------------------------

function restoreForm(overrides: Record<string, string> = {}, omit: string[] = []): FormData {
  const data = new FormData();
  const base: Record<string, string> = {
    slug: "example-project",
    revisionId: "7",
    ...overrides,
  };
  for (const [key, value] of Object.entries(base)) {
    if (omit.includes(key)) continue;
    data.set(key, value);
  }
  return data;
}

function restored(overrides: Record<string, unknown> = {}) {
  return {
    slug: "example-project",
    restoredFrom: 1,
    newVersion: 4,
    publicationStatus: "draft",
    ...overrides,
  };
}

describe("restoreRevisionAction — authorization", () => {
  it("refuses an unauthenticated caller before reading the form", async () => {
    // Restore overwrites live content. The endpoint is reachable by POST
    // without ever loading a page, so this check is the only thing between an
    // anonymous request and a write.
    signedOut();
    const { restoreRevisionAction } = await import(ACTIONS);

    await expect(restoreRevisionAction(EMPTY, restoreForm())).rejects.toBeInstanceOf(
      RedirectSignal,
    );
    expect(restoreProjectRevision).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("does not restore even when the form is otherwise perfectly valid", async () => {
    signedOut();
    const { restoreRevisionAction } = await import(ACTIONS);

    await expect(
      restoreRevisionAction(EMPTY, restoreForm({ slug: "cortex-lab", revisionId: "1" })),
    ).rejects.toBeInstanceOf(RedirectSignal);
    expect(restoreProjectRevision).not.toHaveBeenCalled();
  });

  it("passes the session subject as the actor, never a value from the form", async () => {
    signedIn();
    restoreProjectRevision.mockResolvedValue(restored());
    const { restoreRevisionAction } = await import(ACTIONS);

    await expect(
      restoreRevisionAction(EMPTY, restoreForm({ actor: "someone-else@example.com" })),
    ).rejects.toBeInstanceOf(RedirectSignal);
    expect(restoreProjectRevision).toHaveBeenCalledWith("example-project", 7, {
      actor: "admin@example.com",
    });
  });
});

describe("restoreRevisionAction — input validation", () => {
  it("refuses a missing slug", async () => {
    signedIn();
    const { restoreRevisionAction } = await import(ACTIONS);

    const state = await restoreRevisionAction(EMPTY, restoreForm({}, ["slug"]));
    expect(state.message).toContain("which project");
    expect(restoreProjectRevision).not.toHaveBeenCalled();
  });

  it("refuses a missing revision id", async () => {
    signedIn();
    const { restoreRevisionAction } = await import(ACTIONS);

    const state = await restoreRevisionAction(EMPTY, restoreForm({}, ["revisionId"]));
    expect(state.message).toContain("which revision");
    expect(restoreProjectRevision).not.toHaveBeenCalled();
  });

  it.each([
    ["not-a-number", "letters"],
    ["", "empty, which Number() reads as 0"],
    ["0", "zero"],
    ["-3", "negative"],
    ["2.5", "fractional"],
    ["1e9999", "Infinity once coerced"],
    ["7; DROP TABLE projects", "an injection attempt"],
  ])("refuses revisionId %j (%s) without querying", async (revisionId) => {
    signedIn();
    const { restoreRevisionAction } = await import(ACTIONS);

    const state = await restoreRevisionAction(EMPTY, restoreForm({ revisionId }));
    expect(state.message).toContain("which revision");
    expect(restoreProjectRevision).not.toHaveBeenCalled();
  });
});

describe("restoreRevisionAction — success", () => {
  it("restores the named revision of the named project", async () => {
    signedIn();
    restoreProjectRevision.mockResolvedValue(restored());
    const { restoreRevisionAction } = await import(ACTIONS);

    await expect(restoreRevisionAction(EMPTY, restoreForm())).rejects.toMatchObject({
      location: "/admin/projects/example-project?saved=restored&from=1",
    });
    expect(restoreProjectRevision).toHaveBeenCalledTimes(1);
    expect(restoreProjectRevision.mock.calls[0][0]).toBe("example-project");
    expect(restoreProjectRevision.mock.calls[0][1]).toBe(7);
  });

  it("acts on exactly one project", async () => {
    signedIn();
    restoreProjectRevision.mockResolvedValue(restored({ slug: "atdl-assignment" }));
    const { restoreRevisionAction } = await import(ACTIONS);

    await expect(
      restoreRevisionAction(EMPTY, restoreForm({ slug: "atdl-assignment" })),
    ).rejects.toBeInstanceOf(RedirectSignal);
    expect(restoreProjectRevision).toHaveBeenCalledTimes(1);
    expect(restoreProjectRevision.mock.calls[0][0]).toBe("atdl-assignment");
  });

  it("revalidates the public surfaces the project appears on", async () => {
    signedIn();
    restoreProjectRevision.mockResolvedValue(restored());
    const { restoreRevisionAction } = await import(ACTIONS);

    await expect(restoreRevisionAction(EMPTY, restoreForm())).rejects.toBeInstanceOf(
      RedirectSignal,
    );
    const paths = revalidatePath.mock.calls.map((call) => call[0]);
    expect(paths).toContain("/projects/example-project");
    expect(paths).toContain("/sitemap.xml");
  });

  it("revalidates the previous URL too when the restore renamed the project", async () => {
    // A revision carries the slug the project had at the time, so restoring
    // one can move the public URL back.
    signedIn();
    restoreProjectRevision.mockResolvedValue(restored({ slug: "old-slug" }));
    const { restoreRevisionAction } = await import(ACTIONS);

    await expect(restoreRevisionAction(EMPTY, restoreForm())).rejects.toMatchObject({
      location: "/admin/projects/old-slug?saved=restored&from=1",
    });
    const paths = revalidatePath.mock.calls.map((call) => call[0]);
    expect(paths).toContain("/projects/old-slug");
    expect(paths).toContain("/projects/example-project");
  });

  it("never asks for a publication change", async () => {
    // Restore is a content operation. If it ever started publishing, this is
    // where it would show up first.
    signedIn();
    restoreProjectRevision.mockResolvedValue(restored());
    const { restoreRevisionAction } = await import(ACTIONS);

    await expect(restoreRevisionAction(EMPTY, restoreForm())).rejects.toBeInstanceOf(
      RedirectSignal,
    );
    expect(setPublicationStatus).not.toHaveBeenCalled();
    expect(updateProject).not.toHaveBeenCalled();
  });
});

describe("restoreRevisionAction — refusals", () => {
  it("reports a revision that is not part of this project's history", async () => {
    signedIn();
    const { RevisionNotFoundError } = await import(REPO);
    restoreProjectRevision.mockRejectedValue(new RevisionNotFoundError("example-project", 7));
    const { restoreRevisionAction } = await import(ACTIONS);

    const state = await restoreRevisionAction(EMPTY, restoreForm());
    expect(state.message).toContain("not part of this project");
    expect(state.message).toContain("Nothing was changed");
  });

  it("surfaces per-field errors when the stored snapshot no longer validates", async () => {
    signedIn();
    const { InvalidRevisionError } = await import(REPO);
    restoreProjectRevision.mockRejectedValue(
      new InvalidRevisionError({ category: "Choose a category." }),
    );
    const { restoreRevisionAction } = await import(ACTIONS);

    const state = await restoreRevisionAction(EMPTY, restoreForm());
    expect(state.errors.category).toBe("Choose a category.");
    expect(state.message).toContain("Nothing was changed");
  });

  it("reports a slug another project has taken since", async () => {
    signedIn();
    const { DuplicateSlugError } = await import(REPO);
    restoreProjectRevision.mockRejectedValue(new DuplicateSlugError("taken-slug"));
    const { restoreRevisionAction } = await import(ACTIONS);

    const state = await restoreRevisionAction(EMPTY, restoreForm());
    expect(state.errors.slug).toContain("taken-slug");
    expect(state.message).toContain("Nothing was restored");
  });

  it("reports a project deleted in another session", async () => {
    signedIn();
    const { ProjectNotFoundError } = await import(REPO);
    restoreProjectRevision.mockRejectedValue(new ProjectNotFoundError("example-project"));
    const { restoreRevisionAction } = await import(ACTIONS);

    const state = await restoreRevisionAction(EMPTY, restoreForm());
    expect(state.message).toContain("no longer exists");
  });

  it("does not revalidate or redirect when the restore was refused", async () => {
    signedIn();
    const { RevisionNotFoundError } = await import(REPO);
    restoreProjectRevision.mockRejectedValue(new RevisionNotFoundError("example-project", 7));
    const { restoreRevisionAction } = await import(ACTIONS);

    await restoreRevisionAction(EMPTY, restoreForm());
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("lets an unexpected failure propagate rather than reporting success", async () => {
    signedIn();
    restoreProjectRevision.mockRejectedValue(new Error("connection reset"));
    const { restoreRevisionAction } = await import(ACTIONS);

    await expect(restoreRevisionAction(EMPTY, restoreForm())).rejects.toThrow("connection reset");
  });
});
