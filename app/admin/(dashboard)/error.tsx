"use client";

// Error boundary for the dashboard routes — Phase 6.
//
// Must be a Client Component: that is how React error boundaries work, and
// Next requires it for `error.tsx`.
//
// ── What it deliberately does not show ─────────────────────────────────────
// `error.message`. In production Next already redacts server error messages
// before they reach the browser, but the content repository throws errors
// whose text names internal modules, the active content source and the reason
// a database read failed (ContentQueryError, ContentUnavailableError). None of
// that belongs in a browser, and ADMIN_DASHBOARD_SPECIFICATION.md §91 is
// explicit that the CMS must not surface server configuration. The digest is
// shown instead: it is the handle Next puts in the server log, so the operator
// can find the real error there (§72 — errors should be actionable).

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-rendered errors are already logged server-side; this covers the
    // client-side ones, which otherwise leave no trace at all.
    console.error("[admin] dashboard render failed", error);
  }, [error]);

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-8">
      <h1 className="font-display text-xl">Something went wrong</h1>
      {/* Deliberately names no cause.

          This used to say the most likely cause was an unreachable PostgreSQL.
          That was wrong twice over: the CMS screens detect unreachability
          themselves and render a specific notice for it, so by the time this
          boundary renders, that explanation has already been ruled out — and
          stating it anyway sent a real diagnosis off after a healthy database
          while the actual fault (a stale dev server holding a Prisma client
          generated before a new model existed) went unexamined.

          A boundary that cannot know the cause should say where the cause is
          recorded, not guess at it. */}
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
        This section could not be loaded. The error itself is in the server log — in development,{" "}
        <code className="mx-1 font-mono text-xs">.next/dev/logs/next-development.log</code> — with
        the stack trace and the line that failed. If the database were simply unreachable this
        screen would say so instead, so look for something more specific.
      </p>

      {error.digest !== undefined && (
        <p className="mt-3 font-mono text-xs text-muted">Error digest: {error.digest}</p>
      )}

      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full border border-foreground/20 px-4 py-2 text-sm transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Try again
      </button>
    </div>
  );
}
