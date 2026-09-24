import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/admin/login/login-form";
import { resolveAuthConfig } from "@/lib/auth/config";
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

  // On a fresh checkout the three admin variables are absent, and every login
  // attempt then fails with a message that looks like a wrong password. Saying
  // so up front turns a confusing dead end into a known first-run step.
  //
  // The notice is deliberately vague: this page is reachable by anyone, so it
  // names no variable, no file and no value. The precise message — which names
  // the missing variable and how to generate it, never its value — goes to the
  // server log, where only the operator sees it.
  //
  // `resolveAuthConfig` rather than `isAuthConfigured`, because the latter
  // discards the error and this needs it in order to log anything.
  let configured = true;
  try {
    resolveAuthConfig({
      ADMIN_EMAIL: process.env.ADMIN_EMAIL,
      ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
      AUTH_SECRET: process.env.AUTH_SECRET,
    });
  } catch (error) {
    configured = false;
    console.error(`[admin] ${error instanceof Error ? error.message : String(error)}`);
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-24">
      <h1 className="font-display text-3xl">Admin</h1>
      <p className="mt-2 text-sm text-muted">Sign in to manage portfolio content.</p>

      {!configured && (
        <p
          role="status"
          className="mt-6 rounded border border-accent/40 bg-accent/5 px-4 py-3 text-sm leading-relaxed"
        >
          Administrator sign-in is not configured on this deployment. See the server log for the
          setup step that is missing.
        </p>
      )}

      <LoginForm />
    </div>
  );
}
