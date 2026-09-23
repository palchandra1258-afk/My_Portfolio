import type { Metadata } from "next";
import { Reveal } from "@/components/reveal";
import { EducationTimeline } from "@/components/education-timeline";
import { getProfile } from "@/lib/repositories/content-repository.server";

export const metadata: Metadata = {
  title: "About",
  description: "Education, experience, skills, and achievements — sourced directly from the resume.",
  alternates: {
    canonical: "/about",
  },
};

export default async function AboutPage() {
  const {
    personal: profile,
    experience,
    skills,
    additionalVerifiedSkills,
    achievements,
  } = await getProfile();

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">About</p>
        <h1 className="mt-2 font-display text-4xl">Hi, I&apos;m {profile.name}.</h1>
        <p className="mt-6 text-lg leading-relaxed text-muted">{profile.summary}</p>
      </Reveal>

      {/* Experience */}
      <section className="mt-16">
        <Reveal>
          <h2 className="font-display text-2xl">Experience</h2>
        </Reveal>
        <div className="mt-6 space-y-6">
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

      {/* Education */}
      <section className="mt-16">
        <Reveal>
          <h2 className="font-display text-2xl">Education & Scholarships</h2>
        </Reveal>
        <div className="mt-8">
          <EducationTimeline />
        </div>
      </section>

      {/* Skills */}
      <section className="mt-16">
        <Reveal>
          <h2 className="font-display text-2xl">Skills</h2>
          <p className="mt-2 text-sm text-muted">As listed on the resume, grouped by category.</p>
        </Reveal>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {Object.entries(skills).map(([category, items]) => (
            <Reveal key={category}>
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

        <Reveal>
          <div className="mt-5 rounded-lg border border-dashed border-border p-5">
            <h3 className="font-display text-base">Also demonstrated on GitHub (not yet on the resume)</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {additionalVerifiedSkills.map((item) => (
                <span key={item} className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-muted">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Achievements */}
      <section className="mt-16 mb-8">
        <Reveal>
          <h2 className="font-display text-2xl">Achievements</h2>
        </Reveal>
        <div className="mt-6 space-y-4">
          {achievements.map((a) => (
            <Reveal key={a.title}>
              <div className="rounded-lg border border-border bg-card p-6">
                <p className="font-display text-lg">{a.title}</p>
                <p className="text-sm text-muted">{a.context}</p>
                <p className="mt-2 font-mono text-[11px] text-muted">{a.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
