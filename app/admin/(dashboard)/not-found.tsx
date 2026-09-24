import Link from "next/link";

// 404 inside the dashboard — Phase 6.
//
// Reached when `notFound()` is called for an unknown project slug, and for any
// unmatched /admin/* path. It renders inside the dashboard layout, which means
// the layout's guard has already run: an unauthenticated request to a bogus
// admin URL is redirected to the login page and never sees this.
//
// It states that the record does not exist and nothing more. Listing which
// slugs do exist here would turn a 404 into a content directory.

export default function DashboardNotFound() {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-8">
      <h1 className="font-display text-xl">Not found</h1>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
        This admin page does not exist. If you followed a project link, the slug may have been
        renamed or removed.
      </p>
      <Link
        href="/admin/projects"
        className="mt-6 inline-block rounded-full border border-foreground/20 px-4 py-2 text-sm transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Back to projects
      </Link>
    </div>
  );
}
