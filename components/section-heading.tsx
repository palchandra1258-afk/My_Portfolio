import { Reveal } from "@/components/reveal";

export function SectionHeading({
  eyebrow,
  heading,
  description,
}: {
  eyebrow: string;
  heading: string;
  description?: string;
}) {
  return (
    <Reveal>
      <div className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
        <h2 className="mt-2 font-display text-3xl">{heading}</h2>
        {description && <p className="mt-4 leading-relaxed text-muted">{description}</p>}
      </div>
    </Reveal>
  );
}
