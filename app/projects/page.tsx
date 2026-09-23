import type { Metadata } from "next";
import { Reveal } from "@/components/reveal";
import { ProjectCard } from "@/components/project-card";
import { getAllProjects } from "@/lib/repositories/content-repository.server";
import type { ProjectCategory } from "@/lib/types";

export const metadata: Metadata = {
  title: "Projects",
  description: "The complete project inventory — featured, supporting, research, and in-progress work, each labeled with its verification status.",
  alternates: {
    canonical: "/projects",
  },
};

const SECTIONS: { key: ProjectCategory; title: string; note: string }[] = [
  { key: "featured", title: "Featured", note: "The strongest, most representative work." },
  { key: "supporting", title: "Supporting Projects", note: "Complete, real implementations that round out the picture." },
  { key: "research", title: "Research / Experimental", note: "Smaller-scope or exploratory work." },
  { key: "coming-soon", title: "Coming Soon / Unpublished", note: "Referenced on the resume or on GitHub, but not yet publicly documented — kept here rather than hidden." },
];

export default async function ProjectsPage() {
  const allProjects = await getAllProjects();

  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Full Inventory</p>
        <h1 className="mt-2 font-display text-4xl">Projects</h1>
        <p className="mt-4 max-w-xl text-muted">
          Every project I could substantiate from my resume or GitHub is represented here —
          nothing is hidden for being incomplete. Each card is labeled with its verification status.
        </p>
      </Reveal>

      <div className="mt-16 space-y-16">
        {SECTIONS.map((section) => {
          const items = allProjects.filter((p) => p.category === section.key);
          if (items.length === 0) return null;
          return (
            <section key={section.key}>
              <Reveal>
                <h2 className="font-display text-2xl">{section.title}</h2>
                <p className="mt-1 text-sm text-muted">{section.note}</p>
              </Reveal>
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                {items.map((project, i) => (
                  <Reveal key={project.slug} delay={i * 0.05}>
                    <ProjectCard project={project} />
                  </Reveal>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
