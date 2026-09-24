import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Panel } from "@/components/admin/admin-ui";
import { PublishControls } from "@/components/admin/publish-controls";
import { RevisionHistory } from "@/components/admin/revision-history";
import { listProjectRevisions } from "@/lib/repositories/revision-repository.server";
import {
  publishProjectAction,
  unpublishProjectAction,
} from "@/app/admin/(dashboard)/projects/actions";
import { DatabaseUnavailableNotice, SourceMismatchNotice } from "@/components/admin/cms-notices";
import { EVIDENCE_MARKERS, countEvidenceMarkers } from "@/lib/admin/project-summary";
import { isDatabaseUnavailable } from "@/lib/content/database-availability";
import { requireAdminAuthorized } from "@/lib/auth/session.server";
import {
  getProjectDetailForAdmin,
  getProjectForEdit,
} from "@/lib/repositories/admin-project-repository.server";
import { getActiveSource } from "@/lib/repositories/content-repository.server";
import type { Project } from "@/lib/types";

// Auth-gated: must render per request, never at build time. Note the absence
// of `generateStaticParams` — the public route has one, this one must not.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  // Metadata is produced before the page body, so it gets its own guard: a
  // project title is content, and an unauthenticated request must not learn it
  // from a <title> tag even if the body never renders.
  await requireAdminAuthorized();

  const { slug } = await params;
  // Deliberately does not query the database: a title is not worth a second
  // round-trip, and a database outage must not turn metadata generation into
  // a failed render.
  return {
    title: `Project ${slug}`,
    robots: { index: false, follow: false },
  };
}

export default async function AdminProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string; from?: string }>;
}) {
  // This page's own access control, not inherited from the layout.
  await requireAdminAuthorized();

  const { slug } = await params;

  // Read from PostgreSQL, without a publication filter: the admin must be
  // able to open a draft, which the public read path deliberately hides.
  let project: Project | null;
  let meta: Awaited<ReturnType<typeof getProjectForEdit>>;
  try {
    [project, meta] = await Promise.all([
      getProjectDetailForAdmin(slug),
      getProjectForEdit(slug),
    ]);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return (
        <div className="space-y-6">
          <h1 className="font-display text-2xl">Project</h1>
          <DatabaseUnavailableNotice />
        </div>
      );
    }
    throw error;
  }

  // An unknown slug is a 404 — never an empty editor, and never a silent
  // fallback to some other project's content.
  if (project === null || meta === null) notFound();

  // History is admin-only data and is fetched only after the guard above.
  const revisions = await listProjectRevisions(meta.id);

  const active = await getActiveSource();
  const { saved, from } = await searchParams;
  const markers = countEvidenceMarkers(project);

  // `from` comes off the URL, so it is only used once it is known to be a
  // plain positive integer. React would escape it either way; this keeps the
  // confirmation from reporting a version number that was never a version.
  const restoredFrom = Number(from);
  const restoredFromVersion =
    Number.isInteger(restoredFrom) && restoredFrom > 0 ? restoredFrom : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/projects"
          className="text-sm text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          &larr; All projects
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl">{project.title}</h1>
            <p className="mt-1 font-mono text-xs text-muted">{project.slug}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/admin/projects/${project.slug}/edit`}
              className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Edit
            </Link>
            <Link
              href={`/admin/projects/${project.slug}/preview`}
              className="rounded-full border border-foreground/20 px-3 py-1.5 text-sm transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Preview
            </Link>
            {meta.values.publicationStatus === "published" && (
              // Only offered when it actually exists publicly. Linking to the
              // live URL of a draft would 404 and read as a broken site.
              <Link
                href={`/projects/${project.slug}`}
                className="rounded-full border border-foreground/20 px-3 py-1.5 text-sm transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                View public page
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* §73: a save must be confirmed, not inferred from a page that looks
          roughly right. */}
      {saved !== undefined && (
        <p
          role="status"
          className="rounded-lg border border-emerald-400/40 bg-emerald-400/5 px-4 py-3 text-sm"
        >
          {saved === "created"
            ? "Project created."
            : saved === "published"
              ? "Project published."
              : saved === "unpublished"
                ? "Project unpublished."
                : saved === "restored"
                  ? restoredFromVersion === null
                    ? "Revision restored. The previous content is still in the history below."
                    : `Restored from version ${restoredFromVersion}. The previous content is still in the history below.`
                  : "Changes saved."}
          {meta.values.publicationStatus !== "published" &&
            " It is not published, so visitors cannot see it."}
        </p>
      )}

      <SourceMismatchNotice activeSource={active.source} />

      {markers > 0 && (
        <p
          role="status"
          className="rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 text-sm"
        >
          {markers} unresolved evidence marker{markers === 1 ? "" : "s"} in this project. The text
          below is published as written, so the markers are visible to visitors.
        </p>
      )}

      <PublishControls
        slug={project.slug}
        publicationStatus={meta.values.publicationStatus}
        publishAction={publishProjectAction}
        unpublishAction={unpublishProjectAction}
      />

      <Panel title="Classification">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <Field label="Category" value={project.category} />
          <Field label="Status" value={project.status} />
          <Field label="Featured" value={project.featured ? "Yes" : "No"} />
          <Field label="Evidence status" value={project.evidenceStatus} />
          <Field label="Source" value={project.source} />
          <Field label="Publication" value={meta.values.publicationStatus} />
          <Field label="Display order" value={String(meta.values.displayOrder)} />
          <Field
            label="Content origin"
            value={meta.contentOrigin === "cms" ? "CMS" : "TypeScript import"}
          />
          <Field label="Alternate names" value={project.alternateNames?.join(", ") ?? "—"} />
        </dl>
      </Panel>

      <Panel title="Links">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <Field label="GitHub" value={project.githubUrl ?? "—"} />
          <Field label="Demo" value={project.demoUrl ?? "—"} />
        </dl>
      </Panel>

      <Panel title="Narrative">
        <div className="space-y-5">
          <Prose label="Short description" text={project.shortDescription} />
          <Prose label="Problem" text={project.problem} />
          <Prose label="Approach" text={project.approach} />
          <Prose label="Architecture" text={project.architecture} />
        </div>
      </Panel>

      <Panel
        title="Metrics"
        description="Each metric carries the kind of number it is, so a target never reads as a result."
      >
        {project.metrics.length === 0 ? (
          <Empty>No metrics recorded.</Empty>
        ) : (
          <ul className="space-y-3">
            {project.metrics.map((metric, index) => (
              <li
                key={`${metric.label}-${index}`}
                className="border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm">
                    <Marked text={metric.label} />
                  </span>
                  <span className="font-mono text-sm">
                    <Marked text={metric.value} />
                  </span>
                </div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-wide text-muted">
                  {metric.kind}
                  {metric.source !== undefined && ` · ${metric.source}`}
                </div>
                {metric.note !== undefined && (
                  <p className="mt-1 text-sm text-muted">
                    <Marked text={metric.note} />
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Technologies">
        {project.technologies.length === 0 ? (
          <Empty>No technologies recorded.</Empty>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {project.technologies.map((tech) => (
              <li
                key={tech}
                className="rounded-full border border-border px-2.5 py-1 font-mono text-xs text-muted"
              >
                {tech}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ListPanel title="Results" items={project.results} />
      <ListPanel title="What is working" items={project.whatIsWorking} />
      <ListPanel title="In development" items={project.whatIsInDevelopment} />

      <Panel title="Related projects">
        {project.relatedTo === undefined || project.relatedTo.length === 0 ? (
          <Empty>No relationships recorded.</Empty>
        ) : (
          <ul className="space-y-3">
            {project.relatedTo.map((related) => (
              <li key={related.slug} className="text-sm">
                <Link
                  href={`/admin/projects/${related.slug}`}
                  className="font-mono text-xs transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {related.slug}
                </Link>
                <p className="mt-1 text-muted">
                  <Marked text={related.note} />
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <RevisionHistory slug={project.slug} revisions={revisions} />

      <Panel
        title="Internal verification notes"
        description="Admin-only. Never rendered on the public site."
      >
        <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
          <Marked text={project.verificationNotes} />
        </p>
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

function Prose({ label, text }: { label: string; text?: string }) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-wide text-muted">{label}</div>
      {text === undefined || text.length === 0 ? (
        <p className="mt-1 text-sm text-muted">—</p>
      ) : (
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">
          <Marked text={text} />
        </p>
      )}
    </div>
  );
}

function ListPanel({ title, items }: { title: string; items?: Project["results"] }) {
  return (
    <Panel title={title}>
      {items === undefined || items.length === 0 ? (
        <Empty>Nothing recorded.</Empty>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex gap-2 text-sm leading-relaxed">
              <span aria-hidden className="text-muted">
                ·
              </span>
              <span>
                <Marked text={item} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

/**
 * Renders text with any evidence placeholder highlighted.
 *
 * The split pattern is built from the literal marker constants with their
 * brackets escaped — nothing here interpolates request input into a regex, and
 * the output is ordinary React children. No `dangerouslySetInnerHTML` appears
 * anywhere in the admin area.
 */
function Marked({ text }: { text: string }) {
  const pattern = new RegExp(
    `(${EVIDENCE_MARKERS.map((marker) => marker.replace(/[[\]]/g, "\\$&")).join("|")})`,
  );
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, index) =>
        (EVIDENCE_MARKERS as readonly string[]).includes(part) ? (
          <mark
            key={index}
            className="rounded bg-accent/20 px-1 font-mono text-[11px] uppercase tracking-wide text-accent"
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}
