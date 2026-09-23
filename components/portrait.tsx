import fs from "node:fs";
import path from "node:path";
import Image from "next/image";

const PHOTO_SRC = "/images/profile.jpg";

/**
 * Server Component: checks for the photo at build/request time so the layout
 * never breaks if it's missing — renders a matching placeholder frame instead
 * of a broken image. Drop a real photo at public/images/profile.jpg to
 * replace the placeholder automatically, no code changes needed.
 */
export function Portrait() {
  const hasPhoto = fs.existsSync(path.join(process.cwd(), "public", "images", "profile.jpg"));

  return (
    <div className="relative mx-auto w-full max-w-[260px] sm:max-w-[300px]">
      <div aria-hidden="true" className="absolute -inset-3 border border-accent/25" />
      <div className="relative aspect-[4/5] overflow-hidden border border-border bg-card">
        {hasPhoto ? (
          <Image
            src={PHOTO_SRC}
            alt="Chandrapal — AI/ML Engineer and Data Science undergraduate"
            fill
            sizes="(min-width: 640px) 300px, 260px"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <span className="font-display text-5xl text-muted">C</span>
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted">
              Photo coming soon
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
