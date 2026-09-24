import type { Metadata } from "next";
import Link from "next/link";

import { DatabaseUnavailableNotice, SourceMismatchNotice } from "@/components/admin/cms-notices";
import { isDatabaseUnavailable } from "@/lib/content/database-availability";
import { requireAdminAuthorized } from "@/lib/auth/session.server";
import {
  listProjectsForAdmin,
  type AdminProjectRow,
} from "@/lib/repositories/admin-project-repository.server";
import { getActiveSource } from "@/lib/repositories/content-repository.server";

// Auth-gated: must render per request, never at build time. See the dashboard
// page for why `redirect()` during prerendering is not enough on its own.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projects",
  robots: { index: false, follow: false },
};

export default async function AdminProjectsPage() {
  // This page's own access control, not inherited from the layout.
  await requireAdminAuthorized();

  // Read from PostgreSQL, not through the content repository: this list must
  // show drafts, which the public read path filters out by design, and it is
  // the list the editor acts on. `getActiveSource()` is only for the notice.
  let projects: AdminProjectRow[];
  try {
    projects = await listProjectsForAdmin();
  } catch (error) {
    // A missing database is an expected local state, not a crash worth an
    // error boundary. Anything else is a real fault and propagates.
    if (isDatabaseUnavailable(error)) {
      return (
        <div className="space-y-6">
          <h1 className="font-display text-2xl">Projects</h1>
          <DatabaseUnavailableNotice />
        </div>
      );
    }
    throw error;
  }

  const active = await getActiveSource();
  const drafts = projects.filter((p) => p.publicationStatus !== "published").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Projects</h1>
          <p className="mt-1 text-sm text-muted">
            {projects.length} project{projects.length === 1 ? "" : "s"} in the database, in display
            order
            {drafts > 0 && ` · ${drafts} not published`}.
          </p>
        </div>
        <Link
          href="/admin/projects/new"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          New project
        </Link>
      </div>

      <SourceMismatchNotice activeSource={active.source} />

      {projects.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-5 py-10 text-center">
          <p className="text-sm text-muted">
            No projects in the database yet. Either create one, or run{" "}
            <code className="font-mono text-xs">npm run db:import</code> to load{" "}
            <code className="font-mono text-xs">content/projects.ts</code>.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[64rem] border-collapse text-sm">
            <caption className="sr-only">
              All portfolio projects with their publication state, category, status, featured state,
              publication and update dates, and origin
            </caption>
            <thead>
              <tr className="border-b border-border bg-card text-left">
                <Th>Project</Th>
                <Th>Publication</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th>Featured</Th>
                <Th>Published</Th>
                <Th>Updated</Th>
                <Th>Origin</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.slug} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/projects/${project.slug}`}
                      className="font-medium transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {project.title}
                    </Link>
                    <div className="mt-0.5 font-mono text-xs text-muted">{project.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <PublicationBadge status={project.publicationStatus} />
                  </td>
                  <td className="px-4 py-3 text-muted">{project.category}</td>
                  <td className="px-4 py-3 text-muted">{project.status}</td>
                  <td className="px-4 py-3">
                    {project.featured ? "Yes" : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {/* Never fabricated: a project that has never been published
                        shows a dash rather than a stand-in date. */}
                    {project.publishedAt === null ? "—" : isoDate(project.publishedAt)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {isoDate(project.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
                      {project.contentOrigin === "cms" ? "CMS" : "import"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link
                        href={`/admin/projects/${project.slug}/edit`}
                        className="text-sm text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/admin/projects/${project.slug}/preview`}
                        className="text-sm text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        Preview
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Draft state has to be obvious at a glance (ADMIN_DASHBOARD_SPECIFICATION.md §75). */
function PublicationBadge({ status }: { status: string }) {
  const style =
    status === "published"
      ? "border-emerald-400/30 text-emerald-400"
      : status === "draft"
        ? "border-accent/40 text-accent"
        : "border-border text-muted";
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide ${style}`}
    >
      {status}
    </span>
  );
}

/** Date only, in ISO order — unambiguous across locales and stable to assert on. */
function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="px-4 py-3 font-mono text-[11px] uppercase tracking-wide text-muted">
      {children}
    </th>
  );
}
