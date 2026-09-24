// Admin navigation model — Phase 6 (Admin Shell).
//
// The sidebar's contents live here rather than inside the component so that
// "which section is current?" is a pure function with tests, not something
// only observable by clicking around a running dashboard.
//
// ADMIN_DASHBOARD_SPECIFICATION.md §6 lists the eventual management areas.
// Most of them do not exist yet, and linking to a route that 404s would be
// worse than not linking at all — so every item carries its build status and
// the roadmap phase that delivers it. Planned items render as inert labels,
// never as anchors (§96: navigation must not lead somewhere broken).

export type AdminNavStatus = "available" | "planned";

export interface AdminNavItem {
  /** Route for an available item; also the identity of a planned one. */
  href: string;
  label: string;
  status: AdminNavStatus;
  /** IMPLEMENTATION_ROADMAP.md phase that delivers this area. */
  phase: string;
}

/**
 * Sidebar items in presentation order.
 *
 * Kept deliberately short of §6's full list: only the areas the roadmap
 * actually reaches are shown, so the sidebar reads as a plan rather than as a
 * wall of dead links.
 */
export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", status: "available", phase: "Phase 6" },
  { href: "/admin/projects", label: "Projects", status: "available", phase: "Phase 6" },
  { href: "/admin/media", label: "Media", status: "available", phase: "Phase 8" },
  { href: "/admin/profile", label: "Profile", status: "planned", phase: "Phase 12" },
  { href: "/admin/revisions", label: "Revisions", status: "planned", phase: "Phase 10" },
  { href: "/admin/audit", label: "Audit log", status: "planned", phase: "Phase 11" },
  { href: "/admin/settings", label: "Settings", status: "planned", phase: "Phase 13" },
];

/**
 * Is `item` the section the given path belongs to?
 *
 * Prefix matching, with one exception: `/admin` is the dashboard itself, not
 * an ancestor of every admin route. Without that carve-out the Dashboard link
 * would be highlighted on every page in the section, which tells the operator
 * nothing.
 *
 * `/admin/projects/foo` highlights Projects; `/admin/projectsomething` does
 * not, because the boundary has to be a path separator.
 */
export function isActiveNavItem(item: AdminNavItem, pathname: string): boolean {
  const path = normalizePath(pathname);
  if (item.href === "/admin") return path === "/admin";
  return path === item.href || path.startsWith(`${item.href}/`);
}

/** Trailing slashes are not a different section. */
function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/** The current section's label, for the header. Falls back to "Admin" off-map (e.g. /admin/login). */
export function currentSectionLabel(pathname: string): string {
  const match = ADMIN_NAV_ITEMS.find((item) => isActiveNavItem(item, pathname));
  return match?.label ?? "Admin";
}
