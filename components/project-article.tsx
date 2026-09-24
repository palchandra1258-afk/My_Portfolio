// The project article — the presentation shared by the public project page and
// the admin draft preview.
//
// Extracted so preview is not a second, drifting copy of the public layout.
// CMS_SPECIFICATION.md §44 requires a preview to "render the actual public
// component structure"; the only way to keep that true as the design changes is
// for both routes to render the same component.
//
// It takes a `PublicProject`, never a `Project`. Preview shows an author what a
// visitor would see, so it must be subject to the same projection — internal
// verification notes stay out of preview exactly as they stay out of the public
// page. Purely presentational: no data access, no session, no authorization.

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { GithubIcon } from "@/components/brand-icons";
import { MetricStat } from "@/components/metric-stat";
import { Reveal } from "@/components/reveal";
import { StatusBadge } from "@/components/status-badge";
import type { PublicProject } from "@/lib/types";

/** A resolved relationship — the target project's title, looked up by the caller. */
export interface RelatedProjectLink {
  slug: string;
  note: string;
  title: string;
}

/**
 * The project, minus its raw relationship list.
 *
 * `relatedTo` holds the slug of every project this one points at, resolved or
 * not. The component renders the `related` prop instead — already resolved and
 * already filtered to what the viewer may see — so carrying the raw list would
 * serialize unpublished slugs into the page's RSC payload without rendering
 * them. Omitting it from the type forces each caller to strip it.
 */
export type ArticleProject = Omit<PublicProject, "relatedTo">;

export function ProjectArticle({
  project,
  related,
  backLink = { href: "/projects", label: "All projects" },
  relatedHrefBase = "/projects",
}: {
  project: ArticleProject;
  related: RelatedProjectLink[];
  /** Preview points this at the admin screen the operator came from. */
  backLink?: { href: string; label: string };
  /** Preview keeps related links inside the preview area rather than jumping to the live site. */
  relatedHrefBase?: string;
}) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-20">
      <Reveal>
        <Link
          href={backLink.href}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent"
        >
          <ArrowLeft size={14} /> {backLink.label}
        </Link>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <StatusBadge status={project.evidenceStatus} />
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted">{project.status}</span>
        </div>
        <h1 className="mt-4 font-display text-4xl leading-tight break-words">{project.title}</h1>
        {project.alternateNames && project.alternateNames.length > 0 && (
          <p className="mt-2 font-mono text-xs text-muted">Also known as: {project.alternateNames.join(", ")}</p>
        )}
        <p className="mt-4 text-lg leading-relaxed text-muted">{project.shortDescription}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-foreground/20 px-4 py-2 text-sm hover:border-accent hover:text-accent"
            >
              <GithubIcon size={15} /> View on GitHub
            </a>
          )}
          {project.demoUrl && (
            <a
              href={project.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-foreground/20 px-4 py-2 text-sm hover:border-accent hover:text-accent"
            >
              <ExternalLink size={15} /> Live Demo
            </a>
          )}
        </div>
      </Reveal>

      {project.metrics.length > 0 && (
        <Reveal delay={0.1}>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {project.metrics.map((m) => (
              <MetricStat key={m.label} metric={m} />
            ))}
          </div>
        </Reveal>
      )}

      <div className="mt-12 space-y-10">
        {project.problem && (
          <Reveal>
            <Section title="Problem" body={project.problem} />
          </Reveal>
        )}
        {project.approach && (
          <Reveal>
            <Section title="Approach" body={project.approach} />
          </Reveal>
        )}
        {project.architecture && (
          <Reveal>
            <Section title="Architecture" body={project.architecture} />
          </Reveal>
        )}

        {project.technologies.length > 0 && (
          <Reveal>
            <div>
              <h2 className="font-display text-xl">Technologies</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.technologies.map((t) => (
                  <span key={t} className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {project.whatIsWorking && project.whatIsWorking.length > 0 && (
          <Reveal>
            <div>
              <h2 className="font-display text-xl">What&apos;s Actually Working</h2>
              <ul className="mt-3 space-y-2">
                {project.whatIsWorking.map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        )}

        {project.whatIsInDevelopment && project.whatIsInDevelopment.length > 0 && (
          <Reveal>
            <div>
              <h2 className="font-display text-xl">Still In Development</h2>
              <ul className="mt-3 space-y-2">
                {project.whatIsInDevelopment.map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        )}

        {project.results && project.results.length > 0 && (
          <Reveal>
            <div>
              <h2 className="font-display text-xl">Results</h2>
              <ul className="mt-3 space-y-2">
                {project.results.map((r) => (
                  <li key={r} className="flex gap-2 text-sm leading-relaxed text-muted">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        )}

        {/* Verification notes used to render here. They are internal editorial
            material — a record of what was and was not checked, written for the
            author — and are admin-only. `project` is a PublicProject, which does
            not carry the field at all, so this cannot regress by someone
            re-adding a reference: it would not compile. The evidence *status*
            badge above stays; it is a public-facing claim about confidence. */}
        {related.length > 0 && (
          <Reveal>
            <div>
              <h2 className="font-display text-xl">Related Entries</h2>
              <p className="mt-2 text-sm text-muted">
                These GitHub repositories may relate to this project, but the relationship is unconfirmed —
                kept as separate entries rather than merged.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`${relatedHrefBase}/${r.slug}`}
                    className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent hover:text-accent"
                  >
                    {r.title} →
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </article>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="font-display text-xl">{title}</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}
