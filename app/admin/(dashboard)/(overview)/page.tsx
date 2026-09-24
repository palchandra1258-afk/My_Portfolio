import type { Metadata } from "next";
import Link from "next/link";

import { Panel, StatCard } from "@/components/admin/admin-ui";
import { summarizeProjects } from "@/lib/admin/project-summary";
import { requireAdminAuthorized } from "@/lib/auth/session.server";
import { getActiveSource, getAllProjects } from "@/lib/repositories/content-repository.server";

// Auth-gated: must render per request, never at build time.
//
// Without this, Next prerenders the route to static HTML — the guard runs once
// during `next build` with no cookies, and every visitor afterwards is served
// that frozen result regardless of their session. Reading cookies makes the
// route dynamic in most cases, but `redirect()` during prerendering resolves
// to a static outcome instead, so the intent is stated explicitly here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  // Authoritative check. The layout also calls this — for the header identity,
  // not as this page's protection. A page must never rely on an ancestor for
  // its own access control.
  await requireAdminAuthorized();

  // The same repository the public site reads through, so the dashboard counts
  // what visitors are actually served rather than a second opinion.
  const [projects, active] = await Promise.all([getAllProjects(), getActiveSource()]);
  const summary = summarizeProjects(projects);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Overview of the content currently being served.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Projects" value={summary.total} />
        <StatCard label="Featured" value={summary.featured} note="Shown on the home page" />
        <StatCard
          label="Needs information"
          value={summary.needsInformation}
          tone={summary.needsInformation > 0 ? "attention" : "neutral"}
          note={`${summary.markerCount} marker${summary.markerCount === 1 ? "" : "s"} in published text`}
        />
        <StatCard
          label="Content source"
          value={active.source}
          note={active.fellBack ? "Fell back from database" : `Requested: ${active.requested}`}
          tone={active.fellBack ? "attention" : "neutral"}
        />
      </div>

      {/* The honest statement of what this dashboard can and cannot do. Written
          here rather than left implicit so nobody discovers by experiment that
          there is no Save button. */}
      <Panel
        title="Read-only"
        description="Editing is not implemented yet."
      >
        <p className="text-sm leading-relaxed text-muted">
          The public site reads its content from{" "}
          <code className="font-mono text-xs text-foreground">content/projects.ts</code> and{" "}
          <code className="font-mono text-xs text-foreground">content/resume-data.ts</code>. The
          PostgreSQL database is a verified replica of those files, not yet the source of truth, so
          this dashboard shows content but does not change it. Content edits are still made in the
          TypeScript files and synchronised with{" "}
          <code className="font-mono text-xs text-foreground">npm run db:import</code>.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Creating and editing projects arrives with Phase 7, together with the switch that makes
          the database authoritative — the two have to land together, or an edit saved here would
          never reach a visitor.
        </p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Projects by category"
          actions={
            <Link
              href="/admin/projects"
              className="text-sm text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              View all
            </Link>
          }
        >
          <DistributionList counts={summary.byCategory} />
        </Panel>

        <Panel title="Projects by evidence status">
          <DistributionList counts={summary.byEvidence} />
        </Panel>
      </div>
    </div>
  );
}

function DistributionList({ counts }: { counts: Partial<Record<string, number>> }) {
  const rows = Object.entries(counts).sort(([, a], [, b]) => (b ?? 0) - (a ?? 0));

  if (rows.length === 0) {
    return <p className="text-sm text-muted">No projects to summarise.</p>;
  }

  return (
    <dl className="space-y-2">
      {rows.map(([key, value]) => (
        <div key={key} className="flex items-baseline justify-between gap-4 text-sm">
          <dt className="text-muted">{key}</dt>
          <dd className="font-mono tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
