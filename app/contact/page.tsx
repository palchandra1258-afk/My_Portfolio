import type { Metadata } from "next";
import { Download, Mail, Phone } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { GithubIcon, LinkedinIcon } from "@/components/brand-icons";
import { getProfile } from "@/lib/repositories/content-repository.server";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch — email, LinkedIn, GitHub, or download the resume.",
  alternates: {
    canonical: "/contact",
  },
};

export default async function ContactPage() {
  // Built inside the component rather than at module scope: module-scope
  // construction runs at import time, which a repository that awaits a
  // database cannot satisfy. Values and order are unchanged.
  const { personal: profile } = await getProfile();

  const CHANNELS = [
    { href: `mailto:${profile.email}`, label: "Email", value: profile.email, icon: Mail },
    { href: `tel:${profile.phone}`, label: "Phone", value: profile.phone, icon: Phone },
    { href: profile.linkedin, label: "LinkedIn", value: "in/chandra-pal-a737362a1", icon: LinkedinIcon, external: true },
    { href: profile.github, label: "GitHub", value: "palchandra1258-afk", icon: GithubIcon, external: true },
  ];

  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Contact</p>
        <h1 className="mt-2 font-display text-4xl">Let&apos;s talk.</h1>
        <p className="mt-4 text-lg text-muted">
          Open to internships, new-grad opportunities, and applied AI/ML roles based in {profile.location}
          , remote-friendly.
        </p>
      </Reveal>

      <div className="mt-10 space-y-3">
        {CHANNELS.map((c, i) => (
          <Reveal key={c.label} delay={i * 0.05}>
            <a
              href={c.href}
              target={c.external ? "_blank" : undefined}
              rel={c.external ? "noopener noreferrer" : undefined}
              className="group flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4 transition-colors hover:border-accent/50"
            >
              <span className="flex items-center gap-3">
                <c.icon size={18} className="text-muted group-hover:text-accent" />
                <span>
                  <span className="block text-xs uppercase tracking-wide text-muted">{c.label}</span>
                  <span className="block text-sm">{c.value}</span>
                </span>
              </span>
            </a>
          </Reveal>
        ))}

        <Reveal delay={0.2}>
          <a
            href="/resume.pdf"
            download
            className="flex items-center justify-between rounded-lg border border-accent/40 bg-accent/5 px-5 py-4 text-accent transition-colors hover:bg-accent/10"
          >
            <span className="flex items-center gap-3">
              <Download size={18} />
              <span className="text-sm font-medium">Download full résumé (PDF)</span>
            </span>
          </a>
        </Reveal>
      </div>
    </div>
  );
}
