import Link from "next/link";
import { Mail } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/brand-icons";
import { getProfile } from "@/lib/repositories/content-repository.server";

export async function Footer() {
  const { personal: profile } = await getProfile();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-base">Chandrapal</p>
          <p className="mt-1 text-sm text-muted">AI/ML Engineer · Data Science Undergraduate</p>
        </div>

        <div className="flex items-center gap-5 text-muted">
          <a href={`mailto:${profile.email}`} aria-label="Email" className="transition-colors hover:text-accent">
            <Mail size={18} />
          </a>
          <a href={profile.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="transition-colors hover:text-accent">
            <GithubIcon size={18} />
          </a>
          <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="transition-colors hover:text-accent">
            <LinkedinIcon size={18} />
          </a>
        </div>

        <nav className="flex gap-6 text-sm text-muted">
          <Link href="/projects" className="hover:text-accent">Projects</Link>
          <Link href="/about" className="hover:text-accent">About</Link>
          <Link href="/contact" className="hover:text-accent">Contact</Link>
        </nav>
      </div>
      <p className="mx-auto max-w-5xl px-6 pb-8 font-mono text-[11px] text-muted">
        Every project on this site is labeled with its verification status — verified, self-reported, or in development.
      </p>
    </footer>
  );
}
