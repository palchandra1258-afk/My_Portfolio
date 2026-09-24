// Admin dashboard frame — Phase 6.
//
// A Server Component. It renders chrome around whatever the route produced and
// takes the signed-in identity as a prop; it never looks a session up itself.
// That keeps the security decision in one place — the page's
// `requireAdminAuthorized()` — instead of spreading a second, weaker check
// into a presentational component (ADMIN_DASHBOARD_SPECIFICATION.md §89).
//
// Design: reuses the public site's tokens — `--card`, `--border`, `--muted`,
// `--accent`, the display/mono families (§68). Denser than the public pages
// and with no marketing navigation, but not a second design system, and the
// public site is untouched (IMPLEMENTATION_ROADMAP.md §35).

import Link from "next/link";

import { logout } from "@/app/admin/login/actions";
import { AdminNav } from "@/components/admin/admin-nav";

export function AdminShell({
  email,
  children,
}: {
  /** The authenticated administrator, already verified by the calling page. */
  email: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      {/* First tab stop: a keyboard user should not have to walk the whole
          sidebar to reach the page (§66, §97). */}
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:outline-2 focus:outline-offset-2 focus:outline-accent"
      >
        Skip to content
      </a>

      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
          <div className="flex items-baseline gap-3">
            <Link
              href="/admin"
              className="font-display text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Portfolio admin
            </Link>
            <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
              Private
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="text-muted">{email}</span>
            <Link
              href="/"
              className="text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              View site
            </Link>
            {/* A POST, not a link: signing out changes server state, so it must
                not be reachable by a prefetch or a crawler following an href. */}
            <form action={logout}>
              <button
                type="submit"
                className="rounded-full border border-foreground/20 px-3 py-1.5 text-sm transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8 lg:flex-row lg:gap-10">
        <aside className="lg:w-52 lg:shrink-0">
          <AdminNav />
        </aside>
        <main id="admin-content" className="min-w-0 flex-1 pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}
