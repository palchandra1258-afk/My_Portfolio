import type { Metadata } from "next";

import { logout } from "@/app/admin/login/actions";
import { requireAdminAuthorized } from "@/lib/auth/session.server";

// Auth-gated: must render per request, never at build time.
//
// Without this, Next prerenders the route to static HTML — the guard runs once
// during `next build` with no cookies, and every visitor afterwards is served
// that frozen result regardless of their session. Reading cookies makes the
// route dynamic in most cases, but `redirect()` during prerendering resolves
// to a static outcome instead, so the intent is stated explicitly here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  // Authoritative check. The layout also guards, but a page must never rely on
  // an ancestor for its own access control.
  const session = await requireAdminAuthorized();

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Dashboard</h1>
          <p className="mt-2 text-sm text-muted">Signed in as {session.sub}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-full border border-foreground/20 px-4 py-2 text-sm transition-colors hover:border-accent hover:text-accent"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="mt-10 rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-lg">Content management</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Authentication and route protection are in place. Project editing, draft/preview/publish,
          revisions, audit logging, and media management are not implemented yet — the public site
          continues to read its content from <code className="font-mono text-xs">content/*.ts</code>.
        </p>
      </div>
    </div>
  );
}
