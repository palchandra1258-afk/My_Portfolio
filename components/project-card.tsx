import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group flex h-full flex-col justify-between rounded-lg border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)]"
    >
      <div>
        <div className="mb-3 flex items-start justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
            {project.status}
          </span>
          <ArrowUpRight
            size={16}
            className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
          />
        </div>
        <h3 className="font-display text-xl leading-snug">{project.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{project.shortDescription}</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <StatusBadge status={project.evidenceStatus} />
        {project.technologies.slice(0, 3).map((tech) => (
          <span key={tech} className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-muted">
            {tech}
          </span>
        ))}
      </div>
    </Link>
  );
}
