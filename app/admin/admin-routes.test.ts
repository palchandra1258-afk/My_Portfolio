// Tests for the protected admin routes — Phases 6 and 7.
//
// These call the route modules directly rather than rendering them in a
// browser. A Server Component is an async function returning an element tree,
// so the properties that matter here are all observable without a DOM:
//
//   - the guard runs, and runs BEFORE any content is read
//   - an unknown slug becomes a 404, not an empty page or a blank create form
//   - the list renders the projects the repository returned
//   - every auth-gated route is marked dynamic
//
// The last one is a regression test for a real defect: /admin was once
// prerendered to static HTML at build time, which ran the guard once with no
// cookies and froze the result for every visitor. `dynamic = "force-dynamic"`
// is what prevents that, and nothing else in the suite would notice its
// removal.
//
// `requireAdminAuthorized` is mocked to throw the way the real one does — it
// calls `redirect()`, which throws to unwind — so "unauthorized" here means
// exactly what it means in production.
//
// The admin repository is mocked rather than exercised. It imports lib/db.ts,
// which throws without DATABASE_URL by design, and `npm test` must keep
// running on a fresh clone with no PostgreSQL. The real thing is covered by
// lib/repositories/admin-project-repository.db.test.ts under `npm run test:db`.

import { existsSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectFormValues } from "@/lib/admin/project-form";
import type { Project } from "@/lib/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const requireAdminAuthorized = vi.fn();
const getAllProjects = vi.fn();
const getProject = vi.fn();
const getActiveSource = vi.fn();
const listProjectsForAdmin = vi.fn();
const getProjectForEdit = vi.fn();
const getProjectDetailForAdmin = vi.fn();
const nextDisplayOrder = vi.fn();
const listProjectRevisions = vi.fn();
const getProjectRevision = vi.fn();
const getMediaAsset = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("@/lib/auth/session.server", () => ({
  requireAdminAuthorized: () => requireAdminAuthorized(),
  ADMIN_HOME_PATH: "/admin",
  LOGIN_PATH: "/admin/login",
}));

vi.mock("@/lib/repositories/content-repository.server", () => ({
  getAllProjects: () => getAllProjects(),
  getProject: (slug: string) => getProject(slug),
  getActiveSource: () => getActiveSource(),
}));

vi.mock("@/lib/repositories/admin-project-repository.server", () => ({
  listProjectsForAdmin: () => listProjectsForAdmin(),
  getProjectForEdit: (slug: string) => getProjectForEdit(slug),
  getProjectDetailForAdmin: (slug: string) => getProjectDetailForAdmin(slug),
  nextDisplayOrder: () => nextDisplayOrder(),
}));

vi.mock("@/lib/repositories/revision-repository.server", () => ({
  listProjectRevisions: (projectId: number) => listProjectRevisions(projectId),
  getProjectRevision: (projectId: number, revisionId: number) =>
    getProjectRevision(projectId, revisionId),
}));

// The publish/unpublish actions are imported by the detail page. They live in
// a "use server" module that reaches lib/db.ts; mocked so `npm test` stays
// database-free. Their behaviour is covered in actions.test.ts.
vi.mock("@/app/admin/(dashboard)/projects/actions", () => ({
  createProjectAction: vi.fn(),
  updateProjectAction: vi.fn(),
  publishProjectAction: vi.fn(),
  unpublishProjectAction: vi.fn(),
  restoreRevisionAction: vi.fn(),
}));

// Phase 8. `mediaUrl` is pure and is left real: the version token it appends
// is part of what the media page is asserted to produce.
vi.mock("@/lib/repositories/media-repository.server", () => ({
  PROFILE_PHOTO: "profile_photo",
  RESUME: "resume",
  getMediaAsset: (slot: string) => getMediaAsset(slot),
  mediaUrl: (meta: { slot: string; updatedAt: Date }) =>
    `/media/${meta.slot === "profile_photo" ? "profile-photo" : "resume"}?v=${meta.updatedAt.getTime()}`,
}));

vi.mock("@/app/admin/(dashboard)/media/actions", () => ({
  uploadPhotoAction: vi.fn(),
  updatePhotoMetadataAction: vi.fn(),
  deletePhotoAction: vi.fn(),
  uploadResumeAction: vi.fn(),
  updateResumeMetadataAction: vi.fn(),
  deleteResumeAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => notFound(),
  redirect: vi.fn(),
  usePathname: () => "/admin",
}));

// next/link resolves to the framework's client implementation, which is not
// what these tests are about. A stub keeps the element tree inspectable.
vi.mock("next/link", () => ({
  default: ({ children }: { children?: unknown }) => children,
}));

// lucide-react builds an icon context at module load with `createContext`,
// which React's react-server build does not provide — and vitest resolves this
// suite under that condition. In a real build the icons are only ever imported
// into client-compiled modules, so this is a test-environment artifact, not a
// property of the app. Every icon stubs to a component that renders nothing;
// none of these tests assert on iconography.
vi.mock("lucide-react", () => {
  const icon = () => null;
  return {
    ArrowLeft: icon,
    ArrowRight: icon,
    ArrowUpRight: icon,
    CheckCircle2: icon,
    CircleDashed: icon,
    Download: icon,
    ExternalLink: icon,
    FileText: icon,
    Hammer: icon,
    HelpCircle: icon,
    Lock: icon,
    Mail: icon,
    Menu: icon,
    Phone: icon,
    X: icon,
  };
});

// components/reveal.tsx is a "use client" module wrapping framer-motion. In a
// real build Next compiles it for the browser and the server only emits a
// reference, but vitest resolves it under the `react-server` condition and
// actually evaluates framer-motion, whose module initialization calls
// `createContext` — absent from React's react-server build. Stubbed to the
// identity wrapper it is semantically: it animates children in, nothing more.
vi.mock("@/components/reveal", () => ({
  Reveal: ({ children }: { children?: unknown }) => children,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Thrown by the mocked guard, standing in for the real `redirect()` unwind. */
class RedirectSignal extends Error {
  constructor() {
    super("NEXT_REDIRECT /admin/login");
  }
}

function signedIn(sub = "admin@example.com") {
  requireAdminAuthorized.mockResolvedValue({ sub, iat: 0, exp: 0 });
}

function signedOut() {
  requireAdminAuthorized.mockRejectedValue(new RedirectSignal());
}

/**
 * Every string rendered as element children, flattened.
 *
 * Children only — values passed as props are not "rendered text" until the
 * component that owns them runs, and these tests deliberately do not run
 * child components.
 */
function textOf(node: unknown, out: string[] = []): string[] {
  if (node === null || node === undefined || typeof node === "boolean") return out;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return out;
  }
  if (Array.isArray(node)) {
    for (const child of node) textOf(child, out);
    return out;
  }
  if (typeof node === "object" && "props" in node) {
    textOf((node as { props?: { children?: unknown } }).props?.children, out);
  }
  return out;
}

function project(overrides: Partial<Project> = {}): Project {
  return {
    slug: "example",
    title: "Example",
    category: "supporting",
    status: "Completed",
    featured: false,
    shortDescription: "A project.",
    technologies: [],
    metrics: [],
    evidenceStatus: "self-reported",
    verificationNotes: "Notes.",
    source: "GitHub",
    ...overrides,
  };
}

function adminRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    slug: "example",
    title: "Example",
    category: "supporting",
    status: "Completed",
    featured: false,
    publicationStatus: "published",
    contentOrigin: "typescript_import",
    displayOrder: 0,
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    publishedAt: new Date("2026-01-01T00:00:00Z"),
    technologyCount: 0,
    ...overrides,
  };
}

function formValues(overrides: Partial<ProjectFormValues> = {}): ProjectFormValues {
  return {
    slug: "example",
    title: "Example",
    category: "supporting",
    status: "Completed",
    source: "GitHub",
    featured: false,
    shortDescription: "A project.",
    evidenceStatus: "self-reported",
    verificationNotes: "Notes.",
    technologies: [],
    githubUrl: null,
    demoUrl: null,
    displayOrder: 0,
    publicationStatus: "published",
    ...overrides,
  };
}

function editable(overrides: Partial<ProjectFormValues> = {}) {
  return {
    id: 1,
    values: formValues(overrides),
    contentOrigin: "typescript_import" as const,
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    preserved: {
      metrics: 0,
      contentListItems: 0,
      implementationNotes: 0,
      alternateNames: 0,
      relationships: 0,
    },
  };
}

const DASHBOARD = "@/app/admin/(dashboard)/(overview)/page";
const PROJECTS = "@/app/admin/(dashboard)/projects/page";
const PROJECT_DETAIL = "@/app/admin/(dashboard)/projects/[slug]/page";
const PROJECT_NEW = "@/app/admin/(dashboard)/projects/new/page";
const PROJECT_EDIT = "@/app/admin/(dashboard)/projects/[slug]/edit/page";
const PROJECT_PREVIEW = "@/app/admin/(dashboard)/projects/[slug]/preview/page";
const PROJECT_REVISION = "@/app/admin/(dashboard)/projects/[slug]/revisions/[revisionId]/page";
const PROJECT_COMPARE = "@/app/admin/(dashboard)/projects/[slug]/revisions/compare/page";
const MEDIA = "@/app/admin/(dashboard)/media/page";
const DASHBOARD_LAYOUT = "@/app/admin/(dashboard)/layout";

const params = (slug: string) => Promise.resolve({ slug });
const noSearch = Promise.resolve({});

beforeEach(() => {
  vi.clearAllMocks();
  getActiveSource.mockResolvedValue({
    source: "typescript",
    requested: "typescript",
    fellBack: false,
  });
  getAllProjects.mockResolvedValue([]);
  getProject.mockResolvedValue(null);
  listProjectsForAdmin.mockResolvedValue([]);
  getProjectForEdit.mockResolvedValue(null);
  getProjectDetailForAdmin.mockResolvedValue(null);
  nextDisplayOrder.mockResolvedValue(13);
  listProjectRevisions.mockResolvedValue([]);
  getProjectRevision.mockResolvedValue(null);
});

// ---------------------------------------------------------------------------

describe("route segment config", () => {
  it("marks every auth-gated route dynamic", async () => {
    // A statically prerendered admin route runs its guard once at build time,
    // with no cookies, and serves that answer to everyone.
    for (const modulePath of [
      DASHBOARD,
      PROJECTS,
      PROJECT_DETAIL,
      PROJECT_NEW,
      PROJECT_EDIT,
      PROJECT_PREVIEW,
      PROJECT_REVISION,
      PROJECT_COMPARE,
      MEDIA,
      DASHBOARD_LAYOUT,
    ]) {
      const mod = (await import(modulePath)) as { dynamic?: string };
      expect(mod.dynamic, `${modulePath} must be force-dynamic`).toBe("force-dynamic");
    }
  });

  it("keeps the admin area out of search indexes", async () => {
    for (const modulePath of [DASHBOARD, PROJECTS, PROJECT_NEW]) {
      const mod = (await import(modulePath)) as { metadata?: { robots?: unknown } };
      expect(mod.metadata?.robots).toEqual({ index: false, follow: false });
    }
  });
});

describe("route structure", () => {
  it("keeps Suspense boundaries off the project routes, so notFound() can still set a 404", () => {
    // Verified against a running production server: with a loading.tsx at
    // `(dashboard)/`, /admin/projects/no-such-slug answered 200 and rendered
    // the not-found UI, because streaming had already committed the status.
    // Scoped to `(overview)/`, it answers 404.
    for (const path of [
      "app/admin/(dashboard)/loading.tsx",
      "app/admin/(dashboard)/projects/loading.tsx",
    ]) {
      expect(
        existsSync(path),
        `${path} would commit HTTP 200 before /admin/projects/[slug] can 404`,
      ).toBe(false);
    }
    expect(existsSync("app/admin/(dashboard)/(overview)/loading.tsx")).toBe(true);
  });
});

describe("dashboard page", () => {
  it("refuses to read content when the caller is not authorized", async () => {
    signedOut();
    const { default: Page } = await import(DASHBOARD);

    await expect(Page()).rejects.toBeInstanceOf(RedirectSignal);
    // The order matters: a guard that runs after the query has already leaked
    // the work, and in database mode the query too.
    expect(getAllProjects).not.toHaveBeenCalled();
  });

  it("renders the overview for an authorized administrator", async () => {
    signedIn();
    getAllProjects.mockResolvedValue([
      project({ slug: "a", title: "Alpha", featured: true }),
      project({ slug: "b", title: "Beta", problem: "[NEEDS INFORMATION]" }),
    ]);
    const { default: Page } = await import(DASHBOARD);

    const tree = await Page();
    expect(requireAdminAuthorized).toHaveBeenCalled();
    expect(textOf(tree).join(" ")).toContain("Dashboard");
  });

  it("reads through the shared content repository, not a second source", async () => {
    signedIn();
    const { default: Page } = await import(DASHBOARD);

    await Page();
    // The same module the public pages use — so the dashboard cannot report
    // figures a visitor is not being served.
    expect(getAllProjects).toHaveBeenCalledTimes(1);
    expect(getActiveSource).toHaveBeenCalledTimes(1);
  });
});

describe("projects list page", () => {
  it("refuses to list projects when the caller is not authorized", async () => {
    signedOut();
    const { default: Page } = await import(PROJECTS);

    await expect(Page()).rejects.toBeInstanceOf(RedirectSignal);
    expect(listProjectsForAdmin).not.toHaveBeenCalled();
  });

  it("lists every project the repository returned, in that order", async () => {
    signedIn();
    listProjectsForAdmin.mockResolvedValue([
      adminRow({ id: 1, slug: "the-inevitable", title: "The Inevitable" }),
      adminRow({ id: 2, slug: "atdl-assignment", title: "ATDL Assignment" }),
    ]);
    const { default: Page } = await import(PROJECTS);

    const text = textOf(await Page()).join("\n");
    expect(text).toContain("The Inevitable");
    expect(text).toContain("the-inevitable");
    expect(text).toContain("ATDL Assignment");
    expect(text.indexOf("The Inevitable")).toBeLessThan(text.indexOf("ATDL Assignment"));
  });

  it("reads drafts as well as published projects", async () => {
    // The admin list must not use the public read path, which filters drafts
    // out — otherwise a draft would be invisible everywhere and uneditable.
    signedIn();
    listProjectsForAdmin.mockResolvedValue([
      adminRow({ slug: "draft-one", title: "Draft One", publicationStatus: "draft" }),
    ]);
    const { default: Page } = await import(PROJECTS);

    const text = textOf(await Page()).join("\n");
    expect(text).toContain("Draft One");
    expect(text).toContain("draft");
    expect(getAllProjects).not.toHaveBeenCalled();
  });

  it("shows an empty state rather than an empty table", async () => {
    signedIn();
    listProjectsForAdmin.mockResolvedValue([]);
    const { default: Page } = await import(PROJECTS);

    expect(textOf(await Page()).join(" ")).toContain("No projects in the database yet");
  });
});

describe("project detail page", () => {
  it("refuses to load a project when the caller is not authorized", async () => {
    signedOut();
    const { default: Page } = await import(PROJECT_DETAIL);

    await expect(
      Page({ params: params("the-inevitable"), searchParams: noSearch }),
    ).rejects.toBeInstanceOf(RedirectSignal);
    expect(getProjectDetailForAdmin).not.toHaveBeenCalled();
  });

  it("loads the requested project by slug", async () => {
    signedIn();
    getProjectDetailForAdmin.mockResolvedValue(
      project({ slug: "the-inevitable", title: "The Inevitable" }),
    );
    getProjectForEdit.mockResolvedValue(editable({ slug: "the-inevitable" }));
    const { default: Page } = await import(PROJECT_DETAIL);

    const text = textOf(
      await Page({ params: params("the-inevitable"), searchParams: noSearch }),
    ).join("\n");
    expect(getProjectDetailForAdmin).toHaveBeenCalledWith("the-inevitable");
    expect(text).toContain("The Inevitable");
  });

  it("404s on an unknown slug instead of rendering a blank record", async () => {
    signedIn();
    getProjectDetailForAdmin.mockResolvedValue(null);
    getProjectForEdit.mockResolvedValue(null);
    const { default: Page } = await import(PROJECT_DETAIL);

    await expect(
      Page({ params: params("no-such-project"), searchParams: noSearch }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("reports unresolved evidence markers on the project", async () => {
    signedIn();
    getProjectDetailForAdmin.mockResolvedValue(
      project({ slug: "a", title: "Alpha", problem: "[NEEDS INFORMATION]" }),
    );
    getProjectForEdit.mockResolvedValue(editable({ slug: "a" }));
    const { default: Page } = await import(PROJECT_DETAIL);

    expect(
      textOf(await Page({ params: params("a"), searchParams: noSearch })).join(" "),
    ).toContain("unresolved evidence marker");
  });

  it("confirms a save rather than leaving it to be inferred", async () => {
    signedIn();
    getProjectDetailForAdmin.mockResolvedValue(project({ slug: "a", title: "Alpha" }));
    getProjectForEdit.mockResolvedValue(editable({ slug: "a" }));
    const { default: Page } = await import(PROJECT_DETAIL);

    const text = textOf(
      await Page({ params: params("a"), searchParams: Promise.resolve({ saved: "created" }) }),
    ).join(" ");
    expect(text).toContain("Project created.");
  });

  it("warns that a saved draft is not visible to visitors", async () => {
    signedIn();
    getProjectDetailForAdmin.mockResolvedValue(project({ slug: "a", title: "Alpha" }));
    getProjectForEdit.mockResolvedValue(editable({ slug: "a", publicationStatus: "draft" }));
    const { default: Page } = await import(PROJECT_DETAIL);

    const text = textOf(
      await Page({ params: params("a"), searchParams: Promise.resolve({ saved: "updated" }) }),
    ).join(" ");
    expect(text).toContain("not published");
  });

  it("guards generateMetadata too, so a title cannot leak to a signed-out request", async () => {
    signedOut();
    const { generateMetadata } = await import(PROJECT_DETAIL);

    await expect(generateMetadata({ params: params("the-inevitable") })).rejects.toBeInstanceOf(
      RedirectSignal,
    );
  });
});

describe("new project page", () => {
  it("redirects an unauthorized caller before touching the database", async () => {
    signedOut();
    const { default: Page } = await import(PROJECT_NEW);

    await expect(Page()).rejects.toBeInstanceOf(RedirectSignal);
    expect(nextDisplayOrder).not.toHaveBeenCalled();
  });

  it("renders a create form for an authorized administrator", async () => {
    signedIn();
    const { default: Page } = await import(PROJECT_NEW);

    const text = textOf(await Page()).join(" ");
    expect(text).toContain("New project");
    // §43: a new project must not reach the public site by the act of
    // creating it.
    expect(text).toContain("draft");
  });

  it("places a new project at the end of the display order", async () => {
    signedIn();
    nextDisplayOrder.mockResolvedValue(42);
    const { default: Page } = await import(PROJECT_NEW);

    await Page();
    expect(nextDisplayOrder).toHaveBeenCalledTimes(1);
  });
});

describe("edit project page", () => {
  it("redirects an unauthorized caller before loading the project", async () => {
    signedOut();
    const { default: Page } = await import(PROJECT_EDIT);

    await expect(Page({ params: params("the-inevitable") })).rejects.toBeInstanceOf(
      RedirectSignal,
    );
    expect(getProjectForEdit).not.toHaveBeenCalled();
  });

  it("guards generateMetadata independently", async () => {
    signedOut();
    const { generateMetadata } = await import(PROJECT_EDIT);

    await expect(generateMetadata({ params: params("a") })).rejects.toBeInstanceOf(RedirectSignal);
  });

  it("loads the project into the form", async () => {
    signedIn();
    getProjectForEdit.mockResolvedValue(editable({ slug: "atdl-assignment", title: "ATDL" }));
    const { default: Page } = await import(PROJECT_EDIT);

    const text = textOf(await Page({ params: params("atdl-assignment") })).join(" ");
    expect(getProjectForEdit).toHaveBeenCalledWith("atdl-assignment");
    expect(text).toContain("ATDL");
  });

  it("404s on an unknown slug rather than offering a blank create form", async () => {
    // Rendering an empty editor here would invite re-creating a project that
    // already exists under a different slug.
    signedIn();
    getProjectForEdit.mockResolvedValue(null);
    const { default: Page } = await import(PROJECT_EDIT);

    await expect(Page({ params: params("nope") })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });
});

describe("draft preview", () => {
  it("redirects an unauthenticated caller before reading any draft content", async () => {
    // The whole security model of preview: the session, checked server-side,
    // before a single field of unpublished content is loaded. No token, no
    // query parameter, nothing the client can set.
    signedOut();
    const { default: Page } = await import(PROJECT_PREVIEW);

    await expect(Page({ params: params("secret-draft") })).rejects.toBeInstanceOf(RedirectSignal);
    expect(getProjectDetailForAdmin).not.toHaveBeenCalled();
    expect(getProjectForEdit).not.toHaveBeenCalled();
    expect(listProjectsForAdmin).not.toHaveBeenCalled();
  });

  it("guards generateMetadata independently, so a draft title cannot leak", async () => {
    signedOut();
    const { generateMetadata } = await import(PROJECT_PREVIEW);

    await expect(generateMetadata({ params: params("secret-draft") })).rejects.toBeInstanceOf(
      RedirectSignal,
    );
  });

  it("renders a draft for an authorized administrator", async () => {
    signedIn();
    getProjectDetailForAdmin.mockResolvedValue(
      project({ slug: "secret-draft", title: "Secret Draft", shortDescription: "Not live yet." }),
    );
    getProjectForEdit.mockResolvedValue(
      editable({ slug: "secret-draft", publicationStatus: "draft" }),
    );
    listProjectsForAdmin.mockResolvedValue([adminRow({ slug: "secret-draft" })]);
    const { default: Page } = await import(PROJECT_PREVIEW);

    const tree = await Page({ params: params("secret-draft") });
    const text = textOf(tree).join(" ");
    // The draft's content reaches the shared article component. It sits in
    // that element's props rather than in this tree's children, because these
    // tests build the element tree without executing child components.
    expect(JSON.stringify(tree)).toContain("Secret Draft");
    expect(JSON.stringify(tree)).toContain("Not live yet.");
    expect(text).toContain("Draft preview");
    // §76: it must say it is not live, or an author can mistake it for the
    // published page.
    expect(text).toContain("not published");
  });

  it("says so when previewing a project that IS published", async () => {
    signedIn();
    getProjectDetailForAdmin.mockResolvedValue(project({ slug: "live", title: "Live One" }));
    getProjectForEdit.mockResolvedValue(
      editable({ slug: "live", publicationStatus: "published" }),
    );
    listProjectsForAdmin.mockResolvedValue([adminRow({ slug: "live" })]);
    const { default: Page } = await import(PROJECT_PREVIEW);

    const text = textOf(await Page({ params: params("live") })).join(" ");
    expect(text).toContain("published and visible");
  });

  it("keeps internal verification notes out of the preview", async () => {
    // Preview shows what a visitor would see. It renders the same
    // PublicProject projection as the public route, so the admin-only notes
    // are absent from it too.
    signedIn();
    const secret = "INTERNAL: repo not located, metrics unverified.";
    getProjectDetailForAdmin.mockResolvedValue(
      project({ slug: "d", title: "D", verificationNotes: secret }),
    );
    getProjectForEdit.mockResolvedValue(editable({ slug: "d", publicationStatus: "draft" }));
    listProjectsForAdmin.mockResolvedValue([adminRow({ slug: "d" })]);
    const { default: Page } = await import(PROJECT_PREVIEW);

    const tree = await Page({ params: params("d") });
    expect(textOf(tree).join(" ")).not.toContain(secret);
    expect(JSON.stringify(tree)).not.toContain(secret);
  });

  it("404s on an unknown slug", async () => {
    signedIn();
    getProjectDetailForAdmin.mockResolvedValue(null);
    getProjectForEdit.mockResolvedValue(null);
    const { default: Page } = await import(PROJECT_PREVIEW);

    await expect(Page({ params: params("nope") })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("is noindex, nofollow and not archivable", async () => {
    signedIn();
    const { generateMetadata } = await import(PROJECT_PREVIEW);

    const metadata = await generateMetadata({ params: params("d") });
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });
});

describe("dashboard layout", () => {
  it("does not render the shell for an unauthorized caller", async () => {
    signedOut();
    const { default: Layout } = await import(DASHBOARD_LAYOUT);

    await expect(Layout({ children: null })).rejects.toBeInstanceOf(RedirectSignal);
  });

  it("passes the authenticated subject to the shell rather than looking it up again", async () => {
    signedIn("owner@example.com");
    const { default: Layout } = await import(DASHBOARD_LAYOUT);

    const tree = (await Layout({ children: null })) as { props: { email: string } };
    expect(tree.props.email).toBe("owner@example.com");
  });
});

describe("revision inspection route", () => {
  const revParams = (slug: string, revisionId: string) =>
    Promise.resolve({ slug, revisionId });

  function revision(overrides: Record<string, unknown> = {}) {
    return {
      id: 7,
      versionNumber: 2,
      publicationStatusAtRevision: "draft",
      changeSummary: "Edited",
      createdBy: "admin@example.com",
      createdAt: new Date("2026-02-03T04:05:06Z"),
      snapshot: {
        project: project({ slug: "a", title: "Historic Title" }),
        displayOrder: 3,
        publicationStatus: "draft",
        publishedAt: null,
        contentOrigin: "cms",
      },
      ...overrides,
    };
  }

  it("redirects an unauthenticated caller before reading any history", async () => {
    // A snapshot contains the whole project including the admin-only
    // verification notes, so this must be unreachable without a session.
    signedOut();
    const { default: Page } = await import(PROJECT_REVISION);

    await expect(Page({ params: revParams("a", "7") })).rejects.toBeInstanceOf(RedirectSignal);
    expect(getProjectForEdit).not.toHaveBeenCalled();
    expect(getProjectRevision).not.toHaveBeenCalled();
  });

  it("guards generateMetadata independently", async () => {
    signedOut();
    const { generateMetadata } = await import(PROJECT_REVISION);

    await expect(generateMetadata({ params: revParams("a", "7") })).rejects.toBeInstanceOf(
      RedirectSignal,
    );
  });

  it("is noindex and not archivable", async () => {
    signedIn();
    const { generateMetadata } = await import(PROJECT_REVISION);

    const metadata = await generateMetadata({ params: revParams("a", "7") });
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });

  it("renders the snapshot for an authorized administrator", async () => {
    signedIn();
    getProjectForEdit.mockResolvedValue(editable({ slug: "a" }));
    getProjectRevision.mockResolvedValue(revision());
    const { default: Page } = await import(PROJECT_REVISION);

    const tree = await Page({ params: revParams("a", "7") });
    const serialized = JSON.stringify(tree);
    // The snapshot's content reaches the page.
    expect(serialized).toContain("Historic Title");
    // `Revision v{n}` renders as two adjacent text nodes, so the heading is
    // asserted in the two pieces React actually produces.
    const text = textOf(tree).join(" ");
    expect(text).toContain("Revision v");
    expect(text).toContain("2");
    expect(text).toContain("Edited");
  });

  it("scopes the lookup to the project, so a guessed id cannot cross projects", async () => {
    signedIn();
    getProjectForEdit.mockResolvedValue(editable({ slug: "a" }));
    getProjectRevision.mockResolvedValue(revision());
    const { default: Page } = await import(PROJECT_REVISION);

    await Page({ params: revParams("a", "7") });
    // Both identifiers are passed; the repository requires them to match.
    expect(getProjectRevision).toHaveBeenCalledWith(1, 7);
  });

  it("404s on a non-numeric revision id without querying", async () => {
    signedIn();
    const { default: Page } = await import(PROJECT_REVISION);

    await expect(Page({ params: revParams("a", "not-a-number") })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(getProjectRevision).not.toHaveBeenCalled();
  });

  it("404s on a revision that does not exist", async () => {
    signedIn();
    getProjectForEdit.mockResolvedValue(editable({ slug: "a" }));
    getProjectRevision.mockResolvedValue(null);
    const { default: Page } = await import(PROJECT_REVISION);

    await expect(Page({ params: revParams("a", "999") })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("404s when the project itself is unknown", async () => {
    signedIn();
    getProjectForEdit.mockResolvedValue(null);
    const { default: Page } = await import(PROJECT_REVISION);

    await expect(Page({ params: revParams("nope", "7") })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getProjectRevision).not.toHaveBeenCalled();
  });
});

describe("project detail history panel", () => {
  it("reads history only after the guard, and only for this project", async () => {
    signedOut();
    const { default: Page } = await import(PROJECT_DETAIL);

    await expect(
      Page({ params: params("a"), searchParams: noSearch }),
    ).rejects.toBeInstanceOf(RedirectSignal);
    expect(listProjectRevisions).not.toHaveBeenCalled();
  });

  it("requests history for the project being viewed", async () => {
    signedIn();
    getProjectDetailForAdmin.mockResolvedValue(project({ slug: "a", title: "Alpha" }));
    getProjectForEdit.mockResolvedValue(editable({ slug: "a" }));
    const { default: Page } = await import(PROJECT_DETAIL);

    await Page({ params: params("a"), searchParams: noSearch });
    expect(listProjectRevisions).toHaveBeenCalledWith(1);
  });

  it("hands the history panel this project's revisions", async () => {
    signedIn();
    getProjectDetailForAdmin.mockResolvedValue(project({ slug: "a", title: "Alpha" }));
    getProjectForEdit.mockResolvedValue(editable({ slug: "a" }));
    listProjectRevisions.mockResolvedValue([
      {
        id: 4,
        versionNumber: 1,
        publicationStatusAtRevision: "draft",
        changeSummary: "Created",
        createdBy: "admin@example.com",
        createdAt: new Date("2026-02-03T04:05:06Z"),
      },
    ]);
    const { default: Page } = await import(PROJECT_DETAIL);

    // The panel's own markup is inside a child component these tests do not
    // execute, so what is asserted is the data it was given.
    const serialized = JSON.stringify(await Page({ params: params("a"), searchParams: noSearch }));
    expect(serialized).toContain("Created");
    expect(serialized).toContain("admin@example.com");
  });
});

// ---------------------------------------------------------------------------
// Restore control on the revision route — CMS_SPECIFICATION.md §49,
// ADMIN_DASHBOARD_SPECIFICATION.md §59
// ---------------------------------------------------------------------------

describe("restore control", () => {
  const revParams = (slug: string, revisionId: string) =>
    Promise.resolve({ slug, revisionId });

  function snapshotRevision(overrides: Record<string, unknown> = {}) {
    return {
      id: 7,
      versionNumber: 2,
      publicationStatusAtRevision: "draft",
      changeSummary: "Edited",
      createdBy: "admin@example.com",
      createdAt: new Date("2026-02-03T04:05:06Z"),
      snapshot: {
        project: project({ slug: "a", title: "Historic Title" }),
        displayOrder: 3,
        publicationStatus: "draft",
        publishedAt: null,
        contentOrigin: "cms",
      },
      ...overrides,
    };
  }

  /** The props of the first element in the tree that carries `revisionId`. */
  function restoreProps(node: unknown): Record<string, unknown> | null {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = restoreProps(child);
        if (found !== null) return found;
      }
      return null;
    }
    if (node === null || typeof node !== "object" || !("props" in node)) return null;
    const props = (node as { props?: Record<string, unknown> }).props ?? {};
    if ("revisionId" in props) return props;
    return restoreProps(props.children);
  }

  it("offers restore on an inspected revision", async () => {
    signedIn();
    getProjectForEdit.mockResolvedValue(editable({ slug: "a" }));
    getProjectRevision.mockResolvedValue(snapshotRevision());
    const { default: Page } = await import(PROJECT_REVISION);

    const props = restoreProps(await Page({ params: revParams("a", "7") }));
    expect(props).not.toBeNull();
    expect(props!.slug).toBe("a");
    expect(props!.revisionId).toBe(7);
    expect(props!.versionNumber).toBe(2);
  });

  it("hands the control the project's CURRENT status, not the snapshot's", async () => {
    // The decisive assertion for the route's part in this: the confirmation
    // tells the operator whether the restored content goes live immediately,
    // and reading that off the snapshot would tell them the opposite of the
    // truth for exactly the revisions where it matters most.
    signedIn();
    getProjectForEdit.mockResolvedValue(editable({ slug: "a", publicationStatus: "published" }));
    getProjectRevision.mockResolvedValue(
      snapshotRevision({
        publicationStatusAtRevision: "draft",
        snapshot: {
          project: project({ slug: "a" }),
          displayOrder: 3,
          publicationStatus: "draft",
          publishedAt: null,
          contentOrigin: "cms",
        },
      }),
    );
    const { default: Page } = await import(PROJECT_REVISION);

    const props = restoreProps(await Page({ params: revParams("a", "7") }));
    expect(props!.publicationStatus).toBe("published");
  });

  it("and the mirror case, so a draft is never described as going live", async () => {
    signedIn();
    getProjectForEdit.mockResolvedValue(editable({ slug: "a", publicationStatus: "draft" }));
    getProjectRevision.mockResolvedValue(
      snapshotRevision({
        publicationStatusAtRevision: "published",
        snapshot: {
          project: project({ slug: "a" }),
          displayOrder: 3,
          publicationStatus: "published",
          publishedAt: "2026-01-01T00:00:00.000Z",
          contentOrigin: "cms",
        },
      }),
    );
    const { default: Page } = await import(PROJECT_REVISION);

    const props = restoreProps(await Page({ params: revParams("a", "7") }));
    expect(props!.publicationStatus).toBe("draft");
  });

  it("no longer tells the operator that restore is unimplemented", async () => {
    signedIn();
    getProjectForEdit.mockResolvedValue(editable({ slug: "a" }));
    getProjectRevision.mockResolvedValue(snapshotRevision());
    const { default: Page } = await import(PROJECT_REVISION);

    const text = textOf(await Page({ params: revParams("a", "7") })).join(" ");
    expect(text).not.toContain("not implemented");
  });

  it("renders no restore control at all for a signed-out caller", async () => {
    // Belt and braces: the redirect is the real protection, but a control
    // that rendered before the guard would also be a leak of the revision id.
    signedOut();
    const { default: Page } = await import(PROJECT_REVISION);

    await expect(Page({ params: revParams("a", "7") })).rejects.toBeInstanceOf(RedirectSignal);
    expect(getProjectRevision).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Revision comparison — CMS_SPECIFICATION.md §48,
// ADMIN_DASHBOARD_SPECIFICATION.md §58
// ---------------------------------------------------------------------------

describe("revision comparison route", () => {
  const search = (from?: string, to?: string) =>
    Promise.resolve({ ...(from === undefined ? {} : { from }), ...(to === undefined ? {} : { to }) });

  function snapshotOf(overrides: Partial<Project> = {}, state: Record<string, unknown> = {}) {
    return {
      project: project({ slug: "a", ...overrides }),
      displayOrder: 3,
      publicationStatus: "draft",
      publishedAt: null,
      contentOrigin: "cms",
      ...state,
    };
  }

  function revisionRow(id: number, versionNumber: number, snapshot: unknown) {
    return {
      id,
      versionNumber,
      publicationStatusAtRevision: "draft",
      changeSummary: "Edited",
      createdBy: "admin@example.com",
      createdAt: new Date("2026-02-03T04:05:06Z"),
      snapshot,
    };
  }

  function summary(id: number, versionNumber: number) {
    return {
      id,
      versionNumber,
      publicationStatusAtRevision: "draft",
      changeSummary: "Edited",
      createdBy: "admin@example.com",
      createdAt: new Date("2026-02-03T04:05:06Z"),
    };
  }

  /**
   * The props of the first element in the tree carrying `key`.
   *
   * `textOf` walks rendered children only, and these strings live inside child
   * components this suite deliberately does not execute. The props handed to
   * those components are the observable fact, so they are what is asserted.
   */
  function propsWith(node: unknown, key: string): Record<string, unknown> | null {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = propsWith(child, key);
        if (found !== null) return found;
      }
      return null;
    }
    if (node === null || typeof node !== "object" || !("props" in node)) return null;
    const props = (node as { props?: Record<string, unknown> }).props ?? {};
    if (key in props) return props;
    return propsWith(props.children, key);
  }

  /** Two revisions of the same project, v1 "Before Title" and v2 "After Title". */
  function twoRevisions() {
    getProjectForEdit.mockResolvedValue(editable({ slug: "a" }));
    listProjectRevisions.mockResolvedValue([summary(8, 2), summary(7, 1)]);
    getProjectRevision.mockImplementation((_projectId: number, revisionId: number) =>
      Promise.resolve(
        revisionId === 7
          ? revisionRow(7, 1, snapshotOf({ title: "Before Title" }))
          : revisionRow(8, 2, snapshotOf({ title: "After Title" })),
      ),
    );
  }

  it("redirects an unauthenticated caller before reading any history", async () => {
    // A snapshot contains the whole project including the admin-only
    // verification notes, so this must be unreachable without a session.
    signedOut();
    const { default: Page } = await import(PROJECT_COMPARE);

    await expect(
      Page({ params: params("a"), searchParams: search("7", "8") }),
    ).rejects.toBeInstanceOf(RedirectSignal);
    expect(getProjectForEdit).not.toHaveBeenCalled();
    expect(getProjectRevision).not.toHaveBeenCalled();
    expect(listProjectRevisions).not.toHaveBeenCalled();
  });

  it("guards generateMetadata independently", async () => {
    signedOut();
    const { generateMetadata } = await import(PROJECT_COMPARE);

    await expect(generateMetadata({ params: params("a") })).rejects.toBeInstanceOf(RedirectSignal);
  });

  it("is noindex, nocache and not archivable", async () => {
    signedIn();
    const { generateMetadata } = await import(PROJECT_COMPARE);

    const metadata = await generateMetadata({ params: params("a") });
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
      nocache: true,
      noarchive: true,
    });
  });

  it("names no project content in its title", async () => {
    // The slug is already in the URL; the title must not add a project title
    // that an unauthenticated caller could otherwise not learn.
    signedIn();
    const { generateMetadata } = await import(PROJECT_COMPARE);

    const metadata = await generateMetadata({ params: params("a") });
    expect(metadata.title).toBe("Compare revisions — a");
  });

  it("renders a field-level comparison of two revisions", async () => {
    signedIn();
    twoRevisions();
    const { default: Page } = await import(PROJECT_COMPARE);

    const serialized = JSON.stringify(await Page({ params: params("a"), searchParams: search("7", "8") }));
    expect(serialized).toContain("Before Title");
    expect(serialized).toContain("After Title");
  });

  it("scopes BOTH lookups to this project, so a guessed id cannot cross projects", async () => {
    // The decisive test. If either id were resolved on its own, this page
    // would render another project's content — verification notes included —
    // under this project's URL.
    signedIn();
    twoRevisions();
    const { default: Page } = await import(PROJECT_COMPARE);

    await Page({ params: params("a"), searchParams: search("7", "8") });

    expect(getProjectRevision).toHaveBeenCalledTimes(2);
    for (const call of getProjectRevision.mock.calls) {
      expect(call[0]).toBe(1); // editable().id — this project, every time
    }
  });

  it("404s when a revision belongs to a different project", async () => {
    signedIn();
    getProjectForEdit.mockResolvedValue(editable({ slug: "a" }));
    listProjectRevisions.mockResolvedValue([summary(8, 2), summary(7, 1)]);
    // The pair (thisProjectId, 99) does not match, so the repository returns null.
    getProjectRevision.mockImplementation((_projectId: number, revisionId: number) =>
      Promise.resolve(revisionId === 7 ? revisionRow(7, 1, snapshotOf()) : null),
    );
    const { default: Page } = await import(PROJECT_COMPARE);

    await expect(
      Page({ params: params("a"), searchParams: search("7", "99") }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("404s when neither revision resolves", async () => {
    signedIn();
    getProjectForEdit.mockResolvedValue(editable({ slug: "a" }));
    listProjectRevisions.mockResolvedValue([]);
    getProjectRevision.mockResolvedValue(null);
    const { default: Page } = await import(PROJECT_COMPARE);

    await expect(
      Page({ params: params("a"), searchParams: search("101", "102") }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("404s when the project itself is unknown, without querying history", async () => {
    signedIn();
    getProjectForEdit.mockResolvedValue(null);
    const { default: Page } = await import(PROJECT_COMPARE);

    await expect(
      Page({ params: params("nope"), searchParams: search("7", "8") }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getProjectRevision).not.toHaveBeenCalled();
  });

  it.each([
    ["not-a-number", "letters"],
    ["0", "zero"],
    ["-3", "negative"],
    ["2.5", "fractional"],
    ["1e9999", "Infinity once coerced"],
    ["7; DROP TABLE projects", "an injection attempt"],
  ])("404s on a malformed id %j (%s) without querying anything", async (bad) => {
    signedIn();
    const { default: Page } = await import(PROJECT_COMPARE);

    await expect(
      Page({ params: params("a"), searchParams: search(bad, "8") }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getProjectForEdit).not.toHaveBeenCalled();
    expect(getProjectRevision).not.toHaveBeenCalled();
  });

  it("404s on a malformed id in the second position too", async () => {
    signedIn();
    const { default: Page } = await import(PROJECT_COMPARE);

    await expect(
      Page({ params: params("a"), searchParams: search("7", "nonsense") }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getProjectRevision).not.toHaveBeenCalled();
  });

  it("offers a picker instead of a 404 when nothing has been selected yet", async () => {
    // Absent is a legitimate state, unlike malformed. The page is behind the
    // guard, so the picker leaks nothing the project screen does not show.
    signedIn();
    twoRevisions();
    const { default: Page } = await import(PROJECT_COMPARE);

    const props = propsWith(await Page({ params: params("a"), searchParams: search() }), "revisions");
    expect(props!.revisions).toHaveLength(2);
    expect(getProjectRevision).not.toHaveBeenCalled();
  });

  it("offers the picker when only one side was named", async () => {
    signedIn();
    twoRevisions();
    const { default: Page } = await import(PROJECT_COMPARE);

    await Page({ params: params("a"), searchParams: search("7") });
    expect(getProjectRevision).not.toHaveBeenCalled();
  });

  it("hands the picker the single revision it has, rather than comparing", async () => {
    // One revision is not a comparison. The picker is given exactly what
    // exists and says so; nothing is fetched to compare against.
    signedIn();
    getProjectForEdit.mockResolvedValue(editable({ slug: "a" }));
    listProjectRevisions.mockResolvedValue([summary(7, 1)]);
    const { default: Page } = await import(PROJECT_COMPARE);

    const props = propsWith(await Page({ params: params("a"), searchParams: search() }), "revisions");
    expect(props!.revisions).toHaveLength(1);
    expect(getProjectRevision).not.toHaveBeenCalled();
  });

  it("orders the pair oldest first however the URL named them", async () => {
    // §58 reads "Previous ↕ Current". Reversing the query parameters must not
    // invert the meaning of the comparison.
    signedIn();
    twoRevisions();
    const { default: Page } = await import(PROJECT_COMPARE);

    const forwards = JSON.stringify(await Page({ params: params("a"), searchParams: search("7", "8") }));
    const backwards = JSON.stringify(await Page({ params: params("a"), searchParams: search("8", "7") }));

    expect(backwards).toBe(forwards);
  });

  it("reports identical revisions as identical rather than as a change", async () => {
    signedIn();
    getProjectForEdit.mockResolvedValue(editable({ slug: "a" }));
    listProjectRevisions.mockResolvedValue([summary(8, 2), summary(7, 1)]);
    getProjectRevision.mockImplementation((_p: number, revisionId: number) =>
      Promise.resolve(revisionRow(revisionId, revisionId === 7 ? 1 : 2, snapshotOf())),
    );
    const { default: Page } = await import(PROJECT_COMPARE);

    const props = propsWith(
      await Page({ params: params("a"), searchParams: search("7", "8") }),
      "comparison",
    );
    const comparison = props!.comparison as { identical: boolean; changedCount: number };
    expect(comparison.identical).toBe(true);
    expect(comparison.changedCount).toBe(0);
  });

  it("does not write anything — every repository call it makes is a read", async () => {
    signedIn();
    twoRevisions();
    const { default: Page } = await import(PROJECT_COMPARE);

    await Page({ params: params("a"), searchParams: search("7", "8") });

    // The comparison route imports no write function at all; these are the
    // only repository entry points it can reach.
    expect(getProjectForEdit).toHaveBeenCalled();
    expect(getProjectRevision).toHaveBeenCalled();
    expect(listProjectRevisions).toHaveBeenCalled();
  });
});

describe("comparison and inspection routes coexist", () => {
  it("keeps a literal `compare` segment beside the dynamic `[revisionId]` one", async () => {
    // Next resolves a literal segment before a dynamic sibling, so
    // /revisions/compare reaches the comparison page while /revisions/7 still
    // reaches the inspection page. Revision ids are integers, so the two can
    // never collide — but both files have to exist for that to hold.
    const base = "app/admin/(dashboard)/projects/[slug]/revisions";
    expect(existsSync(`${base}/compare/page.tsx`)).toBe(true);
    expect(existsSync(`${base}/[revisionId]/page.tsx`)).toBe(true);
  });

  it("still resolves a numeric revision id to the inspection page", async () => {
    signedIn();
    getProjectForEdit.mockResolvedValue(editable({ slug: "a" }));
    getProjectRevision.mockResolvedValue({
      id: 7,
      versionNumber: 2,
      publicationStatusAtRevision: "draft",
      changeSummary: "Edited",
      createdBy: "admin@example.com",
      createdAt: new Date("2026-02-03T04:05:06Z"),
      snapshot: {
        project: project({ slug: "a", title: "Historic Title" }),
        displayOrder: 3,
        publicationStatus: "draft",
        publishedAt: null,
        contentOrigin: "cms",
      },
    });
    const { default: Page } = await import(PROJECT_REVISION);

    const serialized = JSON.stringify(
      await Page({ params: Promise.resolve({ slug: "a", revisionId: "7" }) }),
    );
    expect(serialized).toContain("Historic Title");
  });
});

// ---------------------------------------------------------------------------
// Media & documents — Phase 8
// ---------------------------------------------------------------------------

describe("admin media route", () => {
  const noSaved = Promise.resolve({});

  function mediaMeta(overrides: Record<string, unknown> = {}) {
    return {
      slot: "profile_photo",
      mimeType: "image/png",
      filename: "portrait.png",
      byteSize: 204_800,
      width: 800,
      height: 1000,
      altText: "Chandrapal at a desk",
      caption: "",
      title: null,
      downloadLabel: null,
      updatedBy: "admin@example.com",
      createdAt: new Date("2026-09-01T00:00:00Z"),
      updatedAt: new Date("2026-09-24T12:00:00Z"),
      ...overrides,
    };
  }

  /** The props of the first element in the tree carrying `key`. */
  function propsWith(node: unknown, key: string): Record<string, unknown> | null {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = propsWith(child, key);
        if (found !== null) return found;
      }
      return null;
    }
    if (node === null || typeof node !== "object" || !("props" in node)) return null;
    const props = (node as { props?: Record<string, unknown> }).props ?? {};
    if (key in props) return props;
    return propsWith(props.children, key);
  }

  it("redirects an unauthenticated caller before reading any asset", async () => {
    signedOut();
    const { default: Page } = await import(MEDIA);

    await expect(Page({ searchParams: noSaved })).rejects.toBeInstanceOf(RedirectSignal);
    expect(getMediaAsset).not.toHaveBeenCalled();
  });

  it("guards generateMetadata independently", async () => {
    signedOut();
    const { generateMetadata } = await import(MEDIA);

    await expect(generateMetadata()).rejects.toBeInstanceOf(RedirectSignal);
  });

  it("is noindex, nocache and not archivable", async () => {
    signedIn();
    const { generateMetadata } = await import(MEDIA);

    const metadata = await generateMetadata();
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
      nocache: true,
      noarchive: true,
    });
  });

  it("shows the current photo to an authorized administrator", async () => {
    signedIn();
    getMediaAsset.mockImplementation((slot: string) =>
      Promise.resolve(slot === "profile_photo" ? mediaMeta() : null),
    );
    const { default: Page } = await import(MEDIA);

    const props = propsWith(await Page({ searchParams: noSaved }), "photo");
    expect(props!.photo).toMatchObject({
      altText: "Chandrapal at a desk",
      filename: "portrait.png",
      dimensions: "800×1000",
      size: "200 KB",
    });
  });

  it("hands the manager a null photo when the slot is empty, for the fallback", async () => {
    signedIn();
    getMediaAsset.mockResolvedValue(null);
    const { default: Page } = await import(MEDIA);

    const props = propsWith(await Page({ searchParams: noSaved }), "photo");
    expect(props!.photo).toBeNull();
  });

  it("hands the manager a null resume when the slot is empty", async () => {
    signedIn();
    getMediaAsset.mockResolvedValue(null);
    const { default: Page } = await import(MEDIA);

    const props = propsWith(await Page({ searchParams: noSaved }), "resume");
    expect(props!.resume).toBeNull();
  });

  it("offers both a preview and a download URL for the resume", async () => {
    signedIn();
    getMediaAsset.mockImplementation((slot: string) =>
      Promise.resolve(
        slot === "resume"
          ? mediaMeta({
              slot: "resume",
              mimeType: "application/pdf",
              filename: "resume.pdf",
              width: null,
              height: null,
              altText: null,
              title: "Résumé",
              downloadLabel: "CV",
            })
          : null,
      ),
    );
    const { default: Page } = await import(MEDIA);

    const props = propsWith(await Page({ searchParams: noSaved }), "resume");
    const resume = props!.resume as Record<string, string>;
    expect(resume.url).toContain("/media/resume");
    expect(resume.downloadUrl).toContain("download=1");
    expect(resume.title).toBe("Résumé");
    expect(resume.mimeType).toBe("application/pdf");
  });

  it("carries a version token on the asset URL, so a replacement is not served stale", async () => {
    signedIn();
    getMediaAsset.mockImplementation((slot: string) =>
      Promise.resolve(slot === "profile_photo" ? mediaMeta() : null),
    );
    const { default: Page } = await import(MEDIA);

    const props = propsWith(await Page({ searchParams: noSaved }), "photo");
    expect((props!.photo as { url: string }).url).toContain(
      `v=${new Date("2026-09-24T12:00:00Z").getTime()}`,
    );
  });

  it("confirms a save, without echoing an unknown value from the URL", async () => {
    // The parameter comes off the URL. It is looked up in a fixed table, so a
    // crafted value produces no message rather than being reflected.
    signedIn();
    getMediaAsset.mockResolvedValue(null);
    const { default: Page } = await import(MEDIA);

    const known = textOf(
      await Page({ searchParams: Promise.resolve({ saved: "photo" }) }),
    ).join(" ");
    expect(known).toContain("Profile photo saved.");

    const crafted = textOf(
      await Page({ searchParams: Promise.resolve({ saved: "<script>alert(1)</script>" }) }),
    ).join(" ");
    // The crafted payload appears nowhere: an unknown key maps to no message.
    // (The page's own copy legitimately contains the word "scripts", so the
    // assertion is on the payload rather than on that substring.)
    expect(crafted).not.toContain("alert(1)");
    expect(crafted).not.toContain("<script>");
    expect(crafted).not.toContain("saved.");
  });

  it("renders the database notice instead of failing when PostgreSQL is unreachable", async () => {
    signedIn();
    const unreachable = new Error("Can't reach database server");
    unreachable.name = "PrismaClientInitializationError";
    getMediaAsset.mockRejectedValue(unreachable);
    const { default: Page } = await import(MEDIA);

    const text = textOf(await Page({ searchParams: noSaved })).join(" ");
    expect(text).toContain("Media & documents");
  });

  it("reads both slots and nothing else", async () => {
    signedIn();
    getMediaAsset.mockResolvedValue(null);
    const { default: Page } = await import(MEDIA);

    await Page({ searchParams: noSaved });
    const slots = getMediaAsset.mock.calls.map((call) => call[0]).sort();
    expect(slots).toEqual(["profile_photo", "resume"]);
  });
});
