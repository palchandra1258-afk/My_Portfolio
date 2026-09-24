import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminAuthorized } from "@/lib/auth/session.server";

// Frame for the signed-in dashboard — Phase 6.
//
// `(dashboard)` is a route group: it adds no URL segment, so /admin and
// /admin/projects are unchanged. It exists so the admin chrome wraps the
// authenticated pages only — /admin/login sits outside it and must stay
// reachable, and bare, while signed out.
//
// ── Why this layout calls the guard, when app/admin/layout.tsx deliberately
//    does not ────────────────────────────────────────────────────────────────
// Not to protect the pages beneath it. It needs the administrator's identity
// to render the header, and `requireAdminAuthorized()` is the only sanctioned
// way to obtain it. Every page under this group calls the same guard again for
// its own access control, because a layout cannot be the security boundary:
// server actions are separately addressable endpoints that never pass through
// it. Remove any page's guard and that page is unprotected regardless of what
// happens here.
//
// Segment config applies to the whole subtree; each page repeats it anyway, so
// no route can lose it by being moved.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminAuthorized();
  return <AdminShell email={session.sub}>{children}</AdminShell>;
}
