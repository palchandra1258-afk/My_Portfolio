// Draft content must not reach the public surface — CMS_SPECIFICATION.md §43.
//
// The filter itself lives in one place (lib/repositories/project-repository.server.ts
// restricts the query to `published`), and the database-backed proof that it
// works is in lib/repositories/admin-project-repository.db.test.ts. What these
// tests pin down is the other half: that every public surface actually reads
// through that filtered repository, rather than reaching for its own source.
//
// So the content repository is mocked to return only what a published-only
// read would return, and each surface is checked to be derived from it. A page
// that started querying the database directly, or that fell back to
// content/projects.ts, would stop matching.

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicProject } from "@/lib/types";

const getAllProjects = vi.fn();
const getProject = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("@/lib/repositories/content-repository.server", () => ({
  getAllProjects: () => getAllProjects(),
  getProject: (slug: string) => getProject(slug),
  getFeaturedProjects: () => getAllProjects(),
  getProfile: vi.fn(),
  getActiveSource: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: () => notFound() }));
vi.mock("next/link", () => ({ default: ({ children }: { children?: unknown }) => children }));
vi.mock("@/components/reveal", () => ({
  Reveal: ({ children }: { children?: unknown }) => children,
}));
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

const PROJECT_PAGE = "@/app/projects/[slug]/page";
const SITEMAP = "@/app/sitemap";

/** A published project, as the public repository would return it. */
function publicProject(overrides: Partial<PublicProject> = {}): PublicProject {
  return {
    slug: "published-one",
    title: "Published One",
    category: "supporting",
    status: "Completed",
    featured: true,
    shortDescription: "Visible to everyone.",
    technologies: [],
    metrics: [],
    evidenceStatus: "self-reported",
    source: "GitHub",
    ...overrides,
  };
}

const params = (slug: string) => Promise.resolve({ slug });

beforeEach(() => {
  vi.clearAllMocks();
  getAllProjects.mockResolvedValue([publicProject()]);
  getProject.mockResolvedValue(null);
});

describe("public project detail", () => {
  it("renders a published project", async () => {
    getProject.mockResolvedValue(publicProject());
    const { default: Page } = await import(PROJECT_PAGE);

    const tree = await Page({ params: params("published-one") });
    expect(JSON.stringify(tree)).toContain("Published One");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("404s for a draft, because the repository does not return one", async () => {
    // The public reader filters on publication status, so a draft slug is
    // indistinguishable from a slug that does not exist — which is exactly
    // the behaviour wanted: no "this exists but you may not see it" signal.
    getProject.mockResolvedValue(null);
    const { default: Page } = await import(PROJECT_PAGE);

    await expect(Page({ params: params("secret-draft") })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("emits no metadata for a draft — no title, no description", async () => {
    getProject.mockResolvedValue(null);
    const { generateMetadata } = await import(PROJECT_PAGE);

    const metadata = await generateMetadata({ params: params("secret-draft") });
    expect(metadata).toEqual({});
    expect(JSON.stringify(metadata)).not.toContain("secret");
  });

  it("emits metadata for a published project", async () => {
    getProject.mockResolvedValue(publicProject());
    const { generateMetadata } = await import(PROJECT_PAGE);

    const metadata = await generateMetadata({ params: params("published-one") });
    expect(metadata.title).toBe("Published One");
    expect(metadata.description).toBe("Visible to everyone.");
  });

  it("generates static paths only for projects the public reader returned", async () => {
    // A draft therefore gets no prerendered page and no route entry.
    getAllProjects.mockResolvedValue([
      publicProject({ slug: "a" }),
      publicProject({ slug: "b" }),
    ]);
    const { generateStaticParams } = await import(PROJECT_PAGE);

    expect(await generateStaticParams()).toEqual([{ slug: "a" }, { slug: "b" }]);
  });

  it("drops a relationship that points at a project the public cannot see", async () => {
    // Otherwise the page would render a link straight to a 404.
    getProject.mockResolvedValue(
      publicProject({
        slug: "a",
        relatedTo: [
          { slug: "published-one", note: "visible" },
          { slug: "secret-draft", note: "hidden" },
        ],
      }),
    );
    getAllProjects.mockResolvedValue([publicProject({ slug: "published-one" })]);
    const { default: Page } = await import(PROJECT_PAGE);

    const serialized = JSON.stringify(await Page({ params: params("a") }));
    expect(serialized).toContain("published-one");
    expect(serialized).not.toContain("secret-draft");
  });
});

describe("revision history is never public", () => {
  it("is not imported by any public route, component or metadata function", async () => {
    // A revision snapshot contains the whole project including the admin-only
    // verification notes, so a single import of the revision repository into a
    // public module would undo Phase 8 in one step. Checked at the source
    // level because it is a structural guarantee, not a runtime one: no test
    // of rendered output can prove the absence of a future import.
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");

    const publicRoots = ["app/projects", "app/page.tsx", "app/sitemap.ts", "app/robots.ts", "components"];
    const offenders: string[] = [];

    // Split/join rather than a regex: the separator is a backslash on Windows
    // and a forward slash elsewhere, and this has to read the same on both.
    const normalize = (path: string) => path.split("\\").join("/");

    function walk(path: string): void {
      const stats = statSync(path);
      if (stats.isDirectory()) {
        // The admin's own components legitimately read history.
        if (normalize(path).includes("components/admin")) return;
        for (const entry of readdirSync(path)) walk(join(path, entry));
        return;
      }
      if (!path.endsWith(".ts") && !path.endsWith(".tsx")) return;
      const source = readFileSync(path, "utf8");
      if (source.includes("revision-repository")) offenders.push(normalize(path));
    }

    for (const root of publicRoots) walk(root);
    expect(offenders).toEqual([]);
  });

  it("exposes no way to restore a revision from a public module", async () => {
    // Restore is a content *write*. A public route that imported the restore
    // action would make it reachable without ever passing through /admin —
    // and a Server Action is an addressable endpoint, so the import alone is
    // enough to publish it. Checked structurally for the same reason as
    // above: no test of rendered output can prove a future import absent.
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");

    const publicRoots = ["app/projects", "app/page.tsx", "app/sitemap.ts", "app/robots.ts", "components"];
    const forbidden = [
      "restoreProjectRevision",
      "restoreRevisionAction",
      "@/lib/admin/restore",
      "admin-project-repository",
      "(dashboard)/projects/actions",
    ];
    const offenders: string[] = [];

    const normalize = (path: string) => path.split("\\").join("/");

    function walk(path: string): void {
      const stats = statSync(path);
      if (stats.isDirectory()) {
        // The admin's own components legitimately reach the write path.
        if (normalize(path).includes("components/admin")) return;
        for (const entry of readdirSync(path)) walk(join(path, entry));
        return;
      }
      if (!path.endsWith(".ts") && !path.endsWith(".tsx")) return;
      const source = readFileSync(path, "utf8");
      for (const needle of forbidden) {
        if (source.includes(needle)) offenders.push(`${normalize(path)} → ${needle}`);
      }
    }

    for (const root of publicRoots) walk(root);
    expect(offenders).toEqual([]);
  });

  it("exposes no revision comparison from a public module", async () => {
    // §48 closes with "Do not expose internal revision details publicly", and
    // a comparison is two whole snapshots side by side — the densest
    // concentration of admin-only content in the application, internal
    // verification notes included. Checked at the source level for the same
    // reason as the rest of this block: it is a structural guarantee.
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");

    const publicRoots = ["app/projects", "app/page.tsx", "app/sitemap.ts", "app/robots.ts", "components"];
    const forbidden = ["revision-diff", "revision-comparison", "revisions/compare", "compareSnapshots"];
    const offenders: string[] = [];

    const normalize = (path: string) => path.split("\\").join("/");

    function walk(path: string): void {
      const stats = statSync(path);
      if (stats.isDirectory()) {
        // The admin's own components legitimately compare revisions.
        if (normalize(path).includes("components/admin")) return;
        for (const entry of readdirSync(path)) walk(join(path, entry));
        return;
      }
      if (!path.endsWith(".ts") && !path.endsWith(".tsx")) return;
      const source = readFileSync(path, "utf8");
      for (const needle of forbidden) {
        if (source.includes(needle)) offenders.push(`${normalize(path)} → ${needle}`);
      }
    }

    for (const root of publicRoots) walk(root);
    expect(offenders).toEqual([]);
  });

  it("gives no public module a way to write or delete a managed asset", async () => {
    // A public page needs a URL and an alt string, nothing more. If one ever
    // imported the media repository or the media actions it would be holding a
    // write path — and a Server Action becomes an addressable endpoint by
    // being imported at all. The read path is the content funnel, which
    // returns the projected shape only.
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");

    const publicRoots = ["app/projects", "app/page.tsx", "app/sitemap.ts", "app/robots.ts", "components"];
    const forbidden = [
      "media-repository",
      "putMediaAsset",
      "deleteMediaAsset",
      "updateMediaMetadata",
      "getMediaAssetBytes",
      "(dashboard)/media/actions",
    ];
    const offenders: string[] = [];

    const normalize = (path: string) => path.split("\\").join("/");

    function walk(path: string): void {
      const stats = statSync(path);
      if (stats.isDirectory()) {
        // The admin's own components legitimately manage media.
        if (normalize(path).includes("components/admin")) return;
        for (const entry of readdirSync(path)) walk(join(path, entry));
        return;
      }
      if (!path.endsWith(".ts") && !path.endsWith(".tsx")) return;
      const source = readFileSync(path, "utf8");
      for (const needle of forbidden) {
        if (source.includes(needle)) offenders.push(`${normalize(path)} → ${needle}`);
      }
    }

    for (const root of publicRoots) walk(root);
    expect(offenders).toEqual([]);
  });

  it("keeps the sitemap free of revision URLs", async () => {
    const { default: sitemap } = await import(SITEMAP);
    const urls = (await sitemap()).map((entry: { url: string }) => entry.url);

    for (const url of urls) expect(url).not.toContain("revision");
  });
});

describe("sitemap", () => {
  it("lists only the projects the public reader returned", async () => {
    getAllProjects.mockResolvedValue([
      publicProject({ slug: "a" }),
      publicProject({ slug: "b" }),
    ]);
    const { default: sitemap } = await import(SITEMAP);

    const urls = (await sitemap()).map((entry: { url: string }) => entry.url);
    expect(urls.some((u: string) => u.endsWith("/projects/a"))).toBe(true);
    expect(urls.some((u: string) => u.endsWith("/projects/b"))).toBe(true);
    // A draft is absent because it never came back from getAllProjects().
    expect(urls.some((u: string) => u.includes("secret-draft"))).toBe(false);
  });

  it("contains no admin or preview URLs", async () => {
    const { default: sitemap } = await import(SITEMAP);
    const urls = (await sitemap()).map((entry: { url: string }) => entry.url);

    for (const url of urls) {
      expect(url).not.toContain("/admin");
      expect(url).not.toContain("/preview");
    }
  });

  it("still lists the public static routes", async () => {
    const { default: sitemap } = await import(SITEMAP);
    const urls = (await sitemap()).map((entry: { url: string }) => entry.url);

    expect(urls.some((u: string) => u.endsWith("/projects"))).toBe(true);
    expect(urls.some((u: string) => u.endsWith("/about"))).toBe(true);
    expect(urls.some((u: string) => u.endsWith("/contact"))).toBe(true);
  });
});
