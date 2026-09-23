import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { Portrait } from "@/components/portrait";
import { ProjectCard } from "@/components/project-card";
import { SectionHeading } from "@/components/section-heading";
import { FinanceCard } from "@/components/finance-card";
import { EducationTimeline } from "@/components/education-timeline";
import { getFeaturedProjects, getProfile } from "@/lib/repositories/content-repository.server";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

const PROOF_POINTS = [
  { value: "94.50%", label: "Validation accuracy", note: "ATDL_Assignment · verified" },
  { value: "15.49×", label: "Model compression", note: "ATDL_Assignment · verified" },
  { value: "41 / 132", label: "Diseases / symptoms modeled", note: "Zio Development internship" },
];

export default async function Home() {
  const { personal: profile, experience, financeAreas, skills, technologyXFinanceAreas } = await getProfile();
  const featured = await getFeaturedProjects();

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-20 sm:pt-28">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
          <div>
            <Reveal>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                {profile.location} · Open to internships &amp; new-grad roles
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-6 font-display text-4xl leading-[1.1] tracking-tight sm:text-6xl">
                AI/ML Engineer building applied systems — from compressed
                neural networks to agentic AI architectures.
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                Data Science undergraduate at Vidyashilp University with a
                Minor in Finance. I build applied AI/ML systems — most
                recently a verified 15.49× model-compression result — while
                developing a parallel foundation in financial markets,
                corporate finance, and FinTech.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform hover:-translate-y-0.5"
                >
                  View Projects <ArrowRight size={15} />
                </Link>
                <a
                  href="/resume.pdf"
                  download
                  className="inline-flex items-center gap-2 rounded-full border border-foreground/20 px-5 py-2.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
                >
                  Download Resume <Download size={15} />
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <Portrait />
          </Reveal>
        </div>

        {/* Proof strip — verified metrics, unchanged */}
        <Reveal delay={0.32}>
          <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
            {PROOF_POINTS.map((p) => (
              <div key={p.label} className="bg-card p-6">
                <p className="font-display text-3xl text-accent">{p.value}</p>
                <p className="mt-1 text-sm">{p.label}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-muted">{p.note}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Technology */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <SectionHeading
          eyebrow="Technology"
          heading="Building intelligent systems from models to applications."
        />
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(skills).map(([category, items], i) => (
            <Reveal key={category} delay={i * 0.05}>
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-display text-base">{category}</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {items.map((item) => (
                    <span key={item} className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-muted">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Featured projects */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <Reveal>
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Featured Work</p>
              <h2 className="mt-2 font-display text-3xl">Selected Projects</h2>
            </div>
            <Link href="/projects" className="hidden text-sm text-muted hover:text-accent sm:inline">
              View all projects →
            </Link>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {featured.map((project, i) => (
            <Reveal key={project.slug} delay={i * 0.06}>
              <ProjectCard project={project} />
            </Reveal>
          ))}
        </div>
        <Link href="/projects" className="mt-8 inline-block text-sm text-muted hover:text-accent sm:hidden">
          View all projects →
        </Link>
      </section>

      {/* Finance */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <SectionHeading
          eyebrow="Finance"
          heading="Exploring the systems behind capital, markets and financial decisions."
          description="Alongside Data Science and AI/ML, I'm building a foundation in finance through my academic minor and independent exploration of financial markets, institutions, accounting, corporate finance, investment management, and FinTech."
        />
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {financeAreas.map((area, i) => (
            <Reveal key={area.title} delay={i * 0.05}>
              <FinanceCard title={area.title} description={area.description} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Technology x Finance */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <SectionHeading
          eyebrow="Technology × Finance"
          heading="Where intelligent systems meet financial decision-making."
          description="I'm interested in exploring how AI, machine learning, data, and software can intersect with financial markets, investment analysis, and FinTech."
        />
        <Reveal delay={0.1}>
          <div className="mt-8 rounded-lg border border-dashed border-border p-6">
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted">
              Areas I&apos;m exploring — not existing projects
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {technologyXFinanceAreas.map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-border px-3 py-1.5 font-mono text-[11px] text-muted"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Experience */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <SectionHeading eyebrow="Experience" heading="Hands-on delivery." />
        <div className="mt-8 space-y-6">
          {experience.map((job) => (
            <Reveal key={job.title}>
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-display text-lg">{job.title}</p>
                  <p className="font-mono text-xs text-muted">{job.duration}</p>
                </div>
                <p className="text-sm text-muted">{job.organization}</p>
                <ul className="mt-4 space-y-2">
                  {job.bullets.map((b) => (
                    <li key={b} className="flex gap-2 text-sm leading-relaxed text-muted">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Education & Scholarships */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <SectionHeading eyebrow="Education & Scholarships" heading="An academic journey built on merit." />
        <div className="mt-10">
          <EducationTimeline />
        </div>
      </section>

      {/* Contact CTA */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <Reveal>
          <div className="rounded-xl border border-border bg-card px-8 py-14 text-center">
            <h2 className="font-display text-3xl">Let&apos;s build something.</h2>
            <p className="mx-auto mt-3 max-w-md text-muted">
              Open to internships, new-grad roles, and applied AI/ML or
              technology-finance opportunities.
            </p>
            <Link
              href="/contact"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground transition-transform hover:-translate-y-0.5"
            >
              Get in touch <ArrowRight size={15} />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
