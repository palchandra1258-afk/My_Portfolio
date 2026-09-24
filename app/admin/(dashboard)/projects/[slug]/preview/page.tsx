import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DatabaseUnavailableNotice } from "@/components/admin/cms-notices";
import { ProjectArticle, type RelatedProjectLink } from "@/components/project-article";
import { stripRelationships, toPublicProject } from "@/lib/content/public-project";
import { isDatabaseUnavailable } from "@/lib/content/database-availability";
import { requireAdminAuthorized } from "@/lib/auth/session.server";
import {
  getProjectDetailForAdmin,
  getProjectForEdit,
  listProjectsForAdmin,
} from "@/lib/repositories/admin-project-repository.server";
import type { Project } from "@/lib/types";

// Draft preview — CMS_SPECIFICATION.md §44, §68.
//
// ── What makes this safe ───────────────────────────────────────────────────
// Authorization is the session, checked on the server, on this page and again
// in generateMetadata. There is no preview token, no `?preview=1`, no cookie
// the client can set, and no client-side branch: an unauthenticated request is
// redirected to the login page by `requireAdminAuthorized()` before a single
// field of the draft is read. A query parameter is never a credential here.
//
// It lives under /admin, so it inherits the section's `noindex, nofollow`
// metadata (restated below), never appears in sitemap.xml — which only lists
// public routes — and is covered by the `Cache-Control: private, no-store`
// header next.config.ts sets for /admin/:path*, so no shared cache may keep an
// unpublished page.
//
// ── What it shows ──────────────────────────────────────────────────────────
// The same component the public route renders, fed the same `PublicProject`
// projection. So the preview is a faithful view of what a visitor would get —
// including the fact that internal verification notes are absent from it — and
// it cannot drift from the public layout, because there is only one layout.

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  // Guarded in its own right: metadata is produced before the body, and a
  // draft's title must not reach an unauthenticated request through <title>.
  await requireAdminAuthorized();
  const { slug } = await params;
  return {
    title: `Preview ${slug}`,
    robots: { index: false, follow: false, nocache: true, noarchive: true },
  };
}

export default async function ProjectPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // This page's own access control, not inherited from the layout.
  await requireAdminAuthorized();

  const { slug } = await params;

  let project: Project | null;
  let meta: Awaited<ReturnType<typeof getProjectForEdit>>;
  let all: Awaited<ReturnType<typeof listProjectsForAdmin>>;
  try {
    [project, meta, all] = await Promise.all([
      getProjectDetailForAdmin(slug),
      getProjectForEdit(slug),
      listProjectsForAdmin(),
    ]);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return (
        <div className="space-y-6">
          <h1 className="font-display text-2xl">Preview</h1>
          <DatabaseUnavailableNotice />
        </div>
      );
    }
    throw error;
  }

  if (project === null || meta === null) notFound();

  const isDraft = meta.values.publicationStatus !== "published";

  // Titles resolved across every project, drafts included: inside a preview,
  // a link to another draft is legitimate and should not silently vanish the
  // way it does on the public page.
  const titles = new Map(all.map((row) => [row.slug, row.title]));
  const related: RelatedProjectLink[] = (project.relatedTo ?? []).flatMap((r) => {
    const title = titles.get(r.slug);
    return title === undefined ? [] : [{ slug: r.slug, note: r.note, title }];
  });

  // Same treatment as the public route: the resolved `related` list renders,
  // the raw slug list does not travel.
  const articleProject = stripRelationships(toPublicProject(project));

  return (
    <div className="-mx-6 -my-8">
      {/* §76: a preview must announce itself, or an author can mistake it for
          the live page and believe a draft has shipped. */}
      <div
        role="status"
        className="border-b border-accent/40 bg-accent/10 px-6 py-3 text-sm"
      >
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <span>
            <strong className="font-medium">
              {isDraft ? "Draft preview" : "Preview"}
            </strong>{" "}
            {isDraft
              ? "— this project is not published. Visitors cannot see this page."
              : "— this project is published and visible to visitors."}
          </span>
          <span className="flex flex-wrap gap-4">
            <Link
              href={`/admin/projects/${slug}`}
              className="underline underline-offset-4 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Back to project
            </Link>
            <Link
              href={`/admin/projects/${slug}/edit`}
              className="underline underline-offset-4 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Edit
            </Link>
          </span>
        </div>
      </div>

      <ProjectArticle
        project={articleProject}
        related={related}
        backLink={{ href: `/admin/projects/${slug}`, label: "Back to project" }}
        relatedHrefBase="/admin/projects"
      />
    </div>
  );
}
