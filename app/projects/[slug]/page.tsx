import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { GithubIcon } from "@/components/brand-icons";
import { Reveal } from "@/components/reveal";
import { StatusBadge } from "@/components/status-badge";
import { MetricStat } from "@/components/metric-stat";
import { getAllProjects, getProject } from "@/lib/repositories/content-repository.server";

export async function generateStaticParams() {
  const allProjects = await getAllProjects();
  return allProjects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.shortDescription,
    alternates: {
      canonical: `/projects/${slug}`,
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // getProject() derives from getAllProjects() (React cache() in database mode,
  // a cheap array op in TypeScript mode), so resolving `related` against a
  // second getAllProjects() call here costs no extra database read.
  const [project, allProjects] = await Promise.all([getProject(slug), getAllProjects()]);
  if (!project) notFound();

  const related = project.relatedTo
    ?.map((r) => ({ ...r, project: allProjects.find((p) => p.slug === r.slug) }))
    .filter((r) => r.project);

  return (
    <article className="mx-auto max-w-3xl px-6 py-20">
      <Reveal>
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent">
          <ArrowLeft size={14} /> All projects
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

        <Reveal>
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-6">
            <h2 className="font-display text-lg">Verification Notes</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{project.verificationNotes}</p>
          </div>
        </Reveal>

        {related && related.length > 0 && (
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
                    href={`/projects/${r.slug}`}
                    className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent hover:text-accent"
                  >
                    {r.project?.title} →
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
