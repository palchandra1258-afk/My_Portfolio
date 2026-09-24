// Revision history panel — Phase 10.
//
// CMS_SPECIFICATION.md §47 and ADMIN_DASHBOARD_SPECIFICATION.md §56–57: a list
// of what changed and when, with each entry inspectable.
//
// Purely presentational. It is rendered only by admin routes that have already
// established the session; it performs no data access and makes no
// authorization decision of its own.
//
// Deliberately shows summaries, not snapshots: a snapshot carries the whole
// project including the admin-only verification notes, and there is no reason
// to ship thirteen of them into a page that only needs dates and labels.

import Link from "next/link";

import { Panel } from "@/components/admin/admin-ui";
import type { ProjectRevisionSummary } from "@/lib/repositories/revision-repository.server";

export function RevisionHistory({
  slug,
  revisions,
}: {
  slug: string;
  revisions: ProjectRevisionSummary[];
}) {
  return (
    <Panel
      title="History"
      description="Every change recorded, newest first. Nothing here is visible on the public site."
      actions={
        // A comparison needs two revisions to exist before it means anything.
        revisions.length >= 2 ? (
          <Link
            href={`/admin/projects/${slug}/revisions/compare`}
            className="rounded-full border border-foreground/20 px-3 py-1.5 text-sm transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Compare
          </Link>
        ) : undefined
      }
    >
      {revisions.length === 0 ? (
        <p className="text-sm text-muted">
          No revisions yet. History starts at the first change made through the CMS — projects
          loaded by <code className="font-mono text-xs">db:import</code> have none, because no
          edit has been made to them.
        </p>
      ) : (
        <ol className="space-y-3">
          {revisions.map((revision, index) => (
            <li
              key={revision.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-xs text-muted">v{revision.versionNumber}</span>
                <span className="text-sm">{revision.changeSummary ?? "Changed"}</span>
                <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
                  {revision.publicationStatusAtRevision}
                </span>
              </span>
              <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <time
                  dateTime={revision.createdAt.toISOString()}
                  className="font-mono text-xs text-muted"
                >
                  {revision.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </time>
                {/* Only rendered when an actor was actually recorded — never a
                    stand-in like "system" for an author who does not exist. */}
                {revision.createdBy !== null && (
                  <span className="text-xs text-muted">{revision.createdBy}</span>
                )}
                {/* The list runs newest first, so this entry's predecessor is
                    the next one along. The oldest revision has none, and gets
                    no link rather than one that compares it with itself. */}
                {index < revisions.length - 1 && (
                  <Link
                    href={`/admin/projects/${slug}/revisions/compare?from=${revisions[index + 1].id}&to=${revision.id}`}
                    className="text-sm text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Compare with v{revisions[index + 1].versionNumber}
                  </Link>
                )}
                <Link
                  href={`/admin/projects/${slug}/revisions/${revision.id}`}
                  className="text-sm text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Inspect
                </Link>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
