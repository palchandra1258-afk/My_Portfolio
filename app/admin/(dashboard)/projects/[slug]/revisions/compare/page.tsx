import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Panel } from "@/components/admin/admin-ui";
import { DatabaseUnavailableNotice } from "@/components/admin/cms-notices";
import { RevisionComparisonView } from "@/components/admin/revision-comparison";
import { compareSnapshots } from "@/lib/admin/revision-diff";
import { isDatabaseUnavailable } from "@/lib/content/database-availability";
import { requireAdminAuthorized } from "@/lib/auth/session.server";
import { getProjectForEdit } from "@/lib/repositories/admin-project-repository.server";
import {
  getProjectRevision,
  listProjectRevisions,
  type ProjectRevision,
  type ProjectRevisionSummary,
} from "@/lib/repositories/revision-repository.server";

// Revision comparison — CMS_SPECIFICATION.md §48,
// ADMIN_DASHBOARD_SPECIFICATION.md §58.
//
// A snapshot contains the entire project *including* the admin-only
// verification notes, so this route is strictly administrative: guarded on the
// page and again in generateMetadata, served by next.config.ts with
// `private, no-store` and `noindex`, and absent from sitemap.xml. §48 closes
// with "Do not expose internal revision details publicly" — app/public-exposure.test.ts
// asserts structurally that no public module can reach this data.
//
// ── Why a static `compare` segment beside `[revisionId]` ──────────────────
// Next resolves a literal segment before a dynamic sibling, so
// /revisions/compare reaches this page while /revisions/7 still reaches the
// inspection page. Revision ids are integers, so the two can never collide —
// and the route tests pin both halves of that down.
//
// ── Both ids are scoped to this project ───────────────────────────────────
// Each revision is fetched by `(projectId, revisionId)` together, and a
// mismatch is a 404 rather than a distinguishable error. A guessed id cannot
// pull up history belonging to a different project, and the response does not
// reveal whether it named a real revision elsewhere.

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  // Metadata is produced before the page body, so it gets its own guard.
  await requireAdminAuthorized();
  const { slug } = await params;
  return {
    title: `Compare revisions — ${slug}`,
    robots: { index: false, follow: false, nocache: true, noarchive: true },
  };
}

/**
 * A query parameter naming a revision.
 *
 * `Number("")` is 0 and `Number("1e9999")` is Infinity; neither belongs in a
 * query. `undefined` means "not asked for", which is a legitimate state — the
 * page then shows the picker instead of a comparison.
 */
function parseRevisionId(raw: string | undefined): number | null | undefined {
  if (raw === undefined) return undefined;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function CompareRevisionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  // This page's own access control, not inherited from the layout.
  await requireAdminAuthorized();

  const { slug } = await params;
  const { from, to } = await searchParams;

  const fromId = parseRevisionId(from);
  const toId = parseRevisionId(to);

  // A malformed id is a 404, not a database error: anyone can type a URL, and
  // the value must never reach a query unvalidated. Absent is different from
  // malformed and is handled below.
  if (fromId === null || toId === null) notFound();

  let project: Awaited<ReturnType<typeof getProjectForEdit>>;
  let revisions: ProjectRevisionSummary[];
  let pair: [ProjectRevision | null, ProjectRevision | null] = [null, null];
  try {
    project = await getProjectForEdit(slug);
    if (project === null) notFound();

    revisions = await listProjectRevisions(project.id);

    if (fromId !== undefined && toId !== undefined) {
      // Both scoped to this project's id, so a revision belonging to another
      // project simply does not resolve.
      pair = await Promise.all([
        getProjectRevision(project.id, fromId),
        getProjectRevision(project.id, toId),
      ]);
    }
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return (
        <div className="space-y-6">
          <h1 className="font-display text-2xl">Compare revisions</h1>
          <DatabaseUnavailableNotice />
        </div>
      );
    }
    throw error;
  }

  const heading = (
    <div>
      <Link
        href={`/admin/projects/${slug}`}
        className="text-sm text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        &larr; Back to {slug}
      </Link>
      <h1 className="mt-3 font-display text-2xl">Compare revisions</h1>
    </div>
  );

  // Nothing selected yet: offer the picker rather than a 404. This is a
  // legitimate state, and the page is already behind the guard, so it leaks
  // nothing an administrator cannot see on the project screen.
  if (fromId === undefined || toId === undefined) {
    return (
      <div className="space-y-6">
        {heading}
        <RevisionPicker slug={slug} revisions={revisions} />
      </div>
    );
  }

  const [fromRevision, toRevision] = pair;
  // An id that is not part of *this* project's history — whether it does not
  // exist at all or belongs to someone else — is the same 404 either way.
  if (fromRevision === null || toRevision === null) notFound();

  // Presented oldest first whatever order the URL named them in, so the
  // comparison always reads forwards in time (§58: "Previous ↕ Current").
  const [before, after] =
    fromRevision.versionNumber <= toRevision.versionNumber
      ? [fromRevision, toRevision]
      : [toRevision, fromRevision];

  const comparison = compareSnapshots(before.snapshot, after.snapshot);

  return (
    <div className="space-y-6">
      {heading}

      <RevisionComparisonView before={before} after={after} comparison={comparison} />

      <Panel title="Compare a different pair">
        <RevisionPicker slug={slug} revisions={revisions} selectedFrom={before.id} selectedTo={after.id} />
      </Panel>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/admin/projects/${slug}/revisions/${before.id}`}
          className="rounded-full border border-foreground/20 px-4 py-2 text-sm transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Inspect v{before.versionNumber}
        </Link>
        <Link
          href={`/admin/projects/${slug}/revisions/${after.id}`}
          className="rounded-full border border-foreground/20 px-4 py-2 text-sm transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Inspect v{after.versionNumber}
        </Link>
      </div>
    </div>
  );
}

/**
 * Pick any two revisions to compare.
 *
 * A plain GET form: no client component, no JavaScript, and the result is a
 * shareable URL. Submitting navigates to this same page with `from` and `to`
 * set, which is exactly the shape the links in the history panel produce.
 */
function RevisionPicker({
  slug,
  revisions,
  selectedFrom,
  selectedTo,
}: {
  slug: string;
  revisions: ProjectRevisionSummary[];
  selectedFrom?: number;
  selectedTo?: number;
}) {
  if (revisions.length < 2) {
    return (
      <p className="text-sm text-muted">
        A comparison needs two revisions. This project has{" "}
        {revisions.length === 0 ? "none yet" : "only one"}.
      </p>
    );
  }

  // Defaults that make the common question — "what did the last change do?" —
  // one click away: the two most recent revisions.
  const defaultTo = selectedTo ?? revisions[0].id;
  const defaultFrom = selectedFrom ?? revisions[1].id;

  return (
    <form
      method="get"
      action={`/admin/projects/${slug}/revisions/compare`}
      className="flex flex-wrap items-end gap-4"
    >
      <RevisionSelect name="from" label="Before" revisions={revisions} selected={defaultFrom} />
      <RevisionSelect name="to" label="After" revisions={revisions} selected={defaultTo} />
      <button
        type="submit"
        className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Compare
      </button>
    </form>
  );
}

function RevisionSelect({
  name,
  label,
  revisions,
  selected,
}: {
  name: string;
  label: string;
  revisions: ProjectRevisionSummary[];
  selected: number;
}) {
  const id = `compare-${name}`;
  return (
    <div>
      <label
        htmlFor={id}
        className="block font-mono text-[11px] uppercase tracking-wide text-muted"
      >
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={String(selected)}
        className="mt-1 rounded border border-border bg-card px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {revisions.map((revision) => (
          <option key={revision.id} value={revision.id}>
            v{revision.versionNumber} — {revision.changeSummary ?? "Changed"} (
            {revision.createdAt.toISOString().slice(0, 10)})
          </option>
        ))}
      </select>
    </div>
  );
}
