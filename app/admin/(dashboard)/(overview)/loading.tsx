// Loading state for the dashboard overview — Phase 6.
//
// ── Why this sits in an `(overview)` route group instead of at the dashboard
//    root ───────────────────────────────────────────────────────────────────
// A `loading.tsx` opens a Suspense boundary around its segment AND every
// segment below it. Next then streams the shell as soon as the boundary has
// something to show, which commits the HTTP status as 200 before the page
// function has finished. /admin/projects/[slug] calls `notFound()` for an
// unknown slug, and once the status is committed that 404 can only be
// delivered as page content — the response still says 200.
//
// Measured, not assumed: with this file at `(dashboard)/`, an unknown slug
// returned 200 and rendered the not-found UI. Moving it here returned 404 for
// an unknown slug and 200 for a known one.
//
// So the boundary is scoped to the overview route, which is also where the
// most work happens (every project plus the content-source probe). Do not add
// a `loading.tsx` at `(dashboard)/` or at `(dashboard)/projects/` without
// re-checking the status code of /admin/projects/no-such-slug.
//
// ADMIN_DASHBOARD_SPECIFICATION.md §74 also warns against unnecessary
// animation, so this is a static skeleton — no spinner, no pulse, nothing that
// needs a `prefers-reduced-motion` guard (§97).

export default function DashboardOverviewLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="h-7 w-48 rounded bg-card" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-20 rounded-lg border border-border bg-card" />
        ))}
      </div>
      <div className="h-40 rounded-lg border border-border bg-card" />
      <span className="sr-only">Loading content…</span>
    </div>
  );
}
