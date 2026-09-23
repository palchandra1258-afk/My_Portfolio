import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/admin/login/login-form";
import { ADMIN_HOME_PATH, getAdminSession } from "@/lib/auth/session.server";

// Auth-gated: must render per request, never at build time.
//
// Without this, Next prerenders the route to static HTML — the guard runs once
// during `next build` with no cookies, and every visitor afterwards is served
// that frozen result regardless of their session. Reading cookies makes the
// route dynamic in most cases, but `redirect()` during prerendering resolves
// to a static outcome instead, so the intent is stated explicitly here.
export const dynamic = "force-dynamic";

// The admin area is operational tooling, not portfolio content: keep it out of
// search results and out of the sitemap (which only lists public routes).
export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  // An already-authenticated operator has no reason to see a login form.
  if ((await getAdminSession()) !== null) redirect(ADMIN_HOME_PATH);

  return (
    <div className="mx-auto max-w-sm px-6 py-24">
      <h1 className="font-display text-3xl">Admin</h1>
      <p className="mt-2 text-sm text-muted">Sign in to manage portfolio content.</p>
      <LoginForm />
    </div>
  );
}
