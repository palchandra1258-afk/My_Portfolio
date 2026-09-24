import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Panel } from "@/components/admin/admin-ui";
import { DatabaseUnavailableNotice } from "@/components/admin/cms-notices";
import { RestoreControls } from "@/components/admin/restore-controls";
import { restoreRevisionAction } from "@/app/admin/(dashboard)/projects/actions";
import { isDatabaseUnavailable } from "@/lib/content/database-availability";
import { requireAdminAuthorized } from "@/lib/auth/session.server";
import { getProjectForEdit } from "@/lib/repositories/admin-project-repository.server";
import {
  getProjectRevision,
  type ProjectRevision,
} from "@/lib/repositories/revision-repository.server";

// Revision inspection — CMS_SPECIFICATION.md §47, ADMIN_DASHBOARD_SPECIFICATION.md §57.
//
// A snapshot contains the entire project *including* the admin-only
// verification notes, so this route is strictly administrative. It is guarded
// on the page and again in generateMetadata, lives under /admin (which
// next.config.ts serves with `private, no-store` and `noindex`), and is
// absent from sitemap.xml.
//
// The revision is fetched by (projectId, revisionId) together, so a guessed
// revision id cannot surface history belonging to a different project.

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; revisionId: string }>;
}): Promise<Metadata> {
  await requireAdminAuthorized();
  const { slug, revisionId } = await params;
  return {
    title: `Revision ${revisionId} — ${slug}`,
    robots: { index: false, follow: false, nocache: true, noarchive: true },
  };
}

export default async function RevisionPage({
  params,
}: {
  params: Promise<{ slug: string; revisionId: string }>;
}) {
  // This page's own access control, not inherited from the layout.
  await requireAdminAuthorized();

  const { slug, revisionId } = await params;

  // A non-numeric id is a 404, not a database error: the route is public
  // surface area in the sense that anyone can type a URL, and the parameter
  // must never reach a query unvalidated.
  const id = Number(revisionId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  let project: Awaited<ReturnType<typeof getProjectForEdit>>;
  let revision: ProjectRevision | null;
  try {
    project = await getProjectForEdit(slug);
    if (project === null) notFound();
    revision = await getProjectRevision(project.id, id);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return (
        <div className="space-y-6">
          <h1 className="font-display text-2xl">Revision</h1>
          <DatabaseUnavailableNotice />
        </div>
      );
    }
    throw error;
  }

  // `project` was already checked inside the try; repeated here so the value
  // is narrowed for the render below rather than asserted non-null.
  if (revision === null || project === null) notFound();

  const { snapshot } = revision;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/projects/${slug}`}
          className="text-sm text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          &larr; Back to {slug}
        </Link>
        <h1 className="mt-3 font-display text-2xl">
          Revision v{revision.versionNumber}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {revision.changeSummary ?? "Changed"} ·{" "}
          <time dateTime={revision.createdAt.toISOString()}>
            {revision.createdAt.toISOString().slice(0, 16).replace("T", " ")}
          </time>
          {revision.createdBy !== null && ` · ${revision.createdBy}`}
        </p>
      </div>

      <p
        role="status"
        className="rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed text-muted"
      >
        This is what the project looked like at that moment — a historical record, not the current
        content.
      </p>

      {/* The status passed here is the project's *current* one, read a moment
          ago, not `snapshot.publicationStatus`. Restore is a content
          operation: it never changes whether the project is public. */}
      <RestoreControls
        slug={slug}
        revisionId={revision.id}
        versionNumber={revision.versionNumber}
        publicationStatus={project.values.publicationStatus}
        restoreAction={restoreRevisionAction}
      />

      <Panel title="State at this revision">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <Field label="Publication" value={snapshot.publicationStatus} />
          <Field label="Display order" value={String(snapshot.displayOrder)} />
          <Field
            label="Published at"
            value={snapshot.publishedAt === null ? "—" : snapshot.publishedAt.slice(0, 10)}
          />
          <Field
            label="Content origin"
            value={snapshot.contentOrigin === "cms" ? "CMS" : "TypeScript import"}
          />
        </dl>
      </Panel>

      <Panel title="Content at this revision">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <Field label="Title" value={snapshot.project.title} />
          <Field label="Slug" value={snapshot.project.slug} />
          <Field label="Category" value={snapshot.project.category} />
          <Field label="Status" value={snapshot.project.status} />
          <Field label="Featured" value={snapshot.project.featured ? "Yes" : "No"} />
          <Field label="Evidence status" value={snapshot.project.evidenceStatus} />
          <Field label="GitHub" value={snapshot.project.githubUrl ?? "—"} />
          <Field label="Demo" value={snapshot.project.demoUrl ?? "—"} />
        </dl>

        <div className="mt-5 space-y-4">
          <Prose label="Short description" text={snapshot.project.shortDescription} />
          <Prose label="Technologies" text={snapshot.project.technologies.join(", ") || "—"} />
          <Prose
            label="Internal verification notes (never public)"
            text={snapshot.project.verificationNotes || "—"}
          />
        </div>
      </Panel>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{value}</dd>
    </div>
  );
}

function Prose({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{text}</p>
    </div>
  );
}
