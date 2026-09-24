import Image from "next/image";

// The pure projection module, not the repository: a presentation component
// must not name a module that constructs a database client, even in a
// type-only import that erases at compile time.
import type { PublicMediaAsset } from "@/lib/media/public-asset";

/**
 * The portrait frame, with a designed placeholder when there is no photo.
 *
 * ── Why this no longer touches the filesystem ─────────────────────────────
 * It used to call `fs.existsSync` on public/images/profile.jpg. That was fine
 * while the photo could only ever be a committed file, but it hardcoded one
 * storage location into a presentation component — which is exactly what
 * CMS_SPECIFICATION.md §34 warns against ("avoid scattering raw file paths
 * throughout the application"). The decision now arrives as a prop, resolved
 * once by lib/repositories/content-repository.server.ts, so this component
 * renders the same whether the photo is a committed file (TypeScript mode) or
 * a managed asset (database mode).
 *
 * The fallback behaviour is unchanged: no photo means a lettered placeholder
 * in a matching frame, never a broken image.
 */
export function Portrait({ photo }: { photo: PublicMediaAsset | null }) {
  return (
    <div className="relative mx-auto w-full max-w-[260px] sm:max-w-[300px]">
      <div aria-hidden="true" className="absolute -inset-3 border border-accent/25" />
      <div className="relative aspect-[4/5] overflow-hidden border border-border bg-card">
        {photo !== null ? (
          <Image
            src={photo.url}
            // §36: alt text describes meaningful content and is never derived
            // from a filename. The managed asset carries one the owner wrote;
            // the committed file has none, so a description of the subject is
            // used rather than inventing one from the file's name.
            alt={photo.altText ?? "Chandrapal — AI/ML Engineer and Data Science undergraduate"}
            fill
            sizes="(min-width: 640px) 300px, 260px"
            className="object-cover"
            priority
            // A managed asset is served by a route handler that already returns
            // exactly the stored bytes. Sending it through the image optimizer
            // would add a second round trip for no gain, and the optimizer
            // cannot statically prerender a database-backed URL anyway. A
            // committed file in public/ is optimized as before.
            unoptimized={photo.url.startsWith("/media/")}
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
