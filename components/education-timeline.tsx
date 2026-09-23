import { Reveal } from "@/components/reveal";
import { getProfile } from "@/lib/repositories/content-repository.server";

export async function EducationTimeline() {
  const { education: entries } = await getProfile();

  return (
    <div className="space-y-10 border-l border-border pl-8">
      {entries.map((entry, i) => (
        <Reveal key={entry.institution} delay={i * 0.08}>
          <div className="relative">
            <span className="absolute -left-[calc(2rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-accent bg-background" />
            <p className="font-mono text-xs uppercase tracking-wide text-muted">{entry.duration}</p>
            <h3 className="mt-1 font-display text-xl">{entry.institution}</h3>
            <p className="mt-1 text-sm text-muted">{entry.degree}</p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{entry.detail}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
