"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/brand-icons";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

/**
 * Only the two values this component actually renders, not the whole profile.
 *
 * Nav is a Client Component, so anything it imports is bundled for the
 * browser. It used to import the profile repository directly, which put the
 * repository barrel — and everything behind it — into the client bundle. Once
 * a repository reads the database that becomes impossible: Prisma and a
 * connection string cannot ship to a browser. Taking the two strings as props
 * from the server parent keeps that boundary clean and keeps Nav synchronous.
 */
export type NavProps = {
  github: string;
  linkedin: string;
  /**
   * Where the resume lives, and what to call it — resolved by the server
   * parent through the content funnel, for the same reason `github` and
   * `linkedin` are. Null when no resume is available, and the link is then
   * omitted rather than pointing at a 404.
   */
  resume: { url: string; filename: string; label: string } | null;
};

export function Nav({ github, linkedin, resume }: NavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-lg tracking-tight">
          Chandrapal
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors hover:text-accent ${
                pathname === link.href ? "text-foreground" : "text-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <a
            href={github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub profile"
            className="text-muted transition-colors hover:text-accent"
          >
            <GithubIcon size={18} />
          </a>
          <a
            href={linkedin}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn profile"
            className="text-muted transition-colors hover:text-accent"
          >
            <LinkedinIcon size={18} />
          </a>
          {/* `!= null` on purpose, matching both null and undefined. The type
              says the prop is always supplied, but this is a Client Component
              reading props across a serialization boundary: during a dev hot
              reload the layout and this file can briefly be at different
              revisions, and `resume !== null` would then pass for `undefined`
              and throw on `.url`. Observed in the dev log, not hypothetical. */}
          {resume != null && (
            <a
              href={resume.url}
              download={resume.filename}
              className="rounded-full border border-foreground/20 px-4 py-1.5 text-sm transition-colors hover:border-accent hover:text-accent"
            >
              {resume.label}
            </a>
          )}
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-border px-6 py-4 md:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="py-2 text-sm text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center gap-5 border-t border-border pt-4">
            <a href={github} target="_blank" rel="noopener noreferrer" aria-label="GitHub profile">
              <GithubIcon size={18} />
            </a>
            <a href={linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile">
              <LinkedinIcon size={18} />
            </a>
            {resume != null && (
              <a href={resume.url} download={resume.filename} className="text-sm text-accent">
                Download {resume.label}
              </a>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
