// Standing notices for the CMS screens — Phase 7.
//
// Both exist to stop the admin lying by omission.

import Link from "next/link";

/**
 * Shown on every CMS screen while the public site is not reading the database.
 *
 * The CMS necessarily writes to PostgreSQL — a form cannot edit
 * content/projects.ts. When CONTENT_SOURCE is `typescript`, those writes are
 * real and durable but invisible to visitors. That is exactly the situation a
 * CMS must never leave someone to discover by publishing something and
 * checking the live site, so it is stated on the screen where the editing
 * happens (ADMIN_DASHBOARD_SPECIFICATION.md §72, §75).
 */
export function SourceMismatchNotice({ activeSource }: { activeSource: string }) {
  if (activeSource === "database") return null;

  return (
    <div
      role="status"
      className="rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 text-sm leading-relaxed"
    >
      <strong className="font-medium">Edits here are not live yet.</strong> The public site is
      currently serving content from{" "}
      <code className="font-mono text-xs">content/projects.ts</code> (
      <code className="font-mono text-xs">CONTENT_SOURCE=typescript</code>). The CMS reads and
      writes PostgreSQL, so changes you save are stored and visible on these admin screens, but a
      visitor will not see them until the site runs with{" "}
      <code className="font-mono text-xs">CONTENT_SOURCE=database</code>.
    </div>
  );
}

/**
 * Shown when the CMS cannot reach PostgreSQL at all.
 *
 * Unlike the public site, the admin has no TypeScript fallback to offer: there
 * is nothing to edit without the database. Saying so plainly beats an error
 * boundary that only reports that something went wrong.
 */
export function DatabaseUnavailableNotice() {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-8">
      <h2 className="font-display text-lg">The CMS needs PostgreSQL</h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
        Project content is stored in the database, so this screen cannot load while it is
        unreachable. Check that PostgreSQL is running and that{" "}
        <code className="font-mono text-xs">DATABASE_URL</code> is set in{" "}
        <code className="font-mono text-xs">.env</code>. The public site is unaffected — it is
        reading from <code className="font-mono text-xs">content/*.ts</code>.
      </p>
      <Link
        href="/admin"
        className="mt-6 inline-block rounded-full border border-foreground/20 px-4 py-2 text-sm transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
