import type { Metadata } from "next";

// Admin section layout.
//
// Two jobs, and route protection is deliberately NOT one of them:
//
//  1. Keep the whole section out of search indexes.
//  2. Give the admin area its own frame, without the public site's marketing
//     navigation.
//
// Access control lives in each page, action and route handler via
// requireAdmin()/requireAdminAuthorized(). A layout cannot be the security
// boundary — server actions are separately addressable endpoints that do not
// pass through it, and a layout that returned null would still leave those
// endpoints callable. Guarding here as well would give a false sense that the
// section is covered.
//
// /admin/login is inside this layout and must stay reachable while signed out,
// which is a second reason the guard belongs per-page.

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s — Admin",
  },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <section className="min-h-full">{children}</section>;
}
