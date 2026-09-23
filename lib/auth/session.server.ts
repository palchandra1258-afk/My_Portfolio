// Server-side session handling and the admin guard — Phase 5.
//
// This is the only module that touches cookies, and the only place the
// application asks "is this request the administrator?". Everything under
// /admin goes through `requireAdmin()`.
//
// SECURITY_AND_QUALITY.md §6: every protected admin request is authenticated
// on the server. Nothing here trusts a client-supplied user object, a hidden
// field, localStorage, UI state, or a query parameter — the only input is a
// signed HttpOnly cookie the browser cannot read or forge.
//
// `server-only` makes an accidental client import a build error rather than a
// silent leak of the signing secret into a bundle.

import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { resolveAuthConfig, type AdminAuthConfig } from "@/lib/auth/config";
import {
  createSessionToken,
  verifySessionToken,
  SESSION_TTL_SECONDS,
  type SessionPayload,
} from "@/lib/auth/session";

export const SESSION_COOKIE_NAME = "portfolio_admin_session";

/** Where an unauthenticated visitor to /admin/* is sent. */
export const LOGIN_PATH = "/admin/login";

/** Where a successful login lands. */
export const ADMIN_HOME_PATH = "/admin";

function authConfig(): AdminAuthConfig {
  return resolveAuthConfig({
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
    AUTH_SECRET: process.env.AUTH_SECRET,
  });
}

/**
 * Cookie attributes.
 *
 * - `httpOnly` so client JavaScript can never read the session (§12).
 * - `sameSite: "lax"` blocks the cookie on cross-site POSTs, which is what
 *   makes CSRF against the login and admin mutations impractical, while still
 *   allowing normal top-level navigation into /admin.
 * - `secure` in production only, so http://localhost development still works.
 * - `path: "/"` so logout can clear it from anywhere.
 */
function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/** Issue a session cookie. Called only after credentials have been verified. */
export async function startSession(subject: string): Promise<void> {
  const { authSecret } = authConfig();
  const token = createSessionToken(subject, authSecret);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, cookieOptions(SESSION_TTL_SECONDS));
}

/**
 * Invalidate the session.
 *
 * SECURITY_AND_QUALITY.md §14: logout must not merely redirect while leaving a
 * valid session behind. The cookie is overwritten with an empty value and a
 * zero lifetime, so the browser drops it immediately. Because tokens are
 * stateless and short-lived, clearing the cookie is what ends the session.
 */
export async function endSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, "", cookieOptions(0));
  store.delete(SESSION_COOKIE_NAME);
}

/**
 * The current administrator, or null.
 *
 * Returns null rather than throwing when auth is unconfigured, so a
 * half-configured deployment denies access instead of leaking a stack trace.
 */
export async function getAdminSession(): Promise<SessionPayload | null> {
  let secret: string;
  try {
    secret = authConfig().authSecret;
  } catch {
    return null;
  }

  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  const result = verifySessionToken(token, secret);
  return result.valid ? result.payload : null;
}

/**
 * Require an authenticated administrator, or redirect to login.
 *
 * Call this at the top of every protected page, layout, server action and
 * route handler — not only in the layout. A layout guard alone is not a
 * security boundary: server actions are separately addressable endpoints and
 * must each establish their own caller identity.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getAdminSession();
  if (session === null) redirect(LOGIN_PATH);
  return session;
}

/** Authorization check. One role today; the seam exists so §7 has somewhere to grow. */
export async function requireAdminAuthorized(): Promise<SessionPayload> {
  const session = await requireAdmin();
  const { adminEmail } = authConfig();
  // Authentication established *who*; this establishes *whether they may act*.
  // A token signed for any other subject is rejected even though its signature
  // is valid — e.g. after ADMIN_EMAIL is changed, old sessions stop working.
  if (session.sub !== adminEmail) redirect(LOGIN_PATH);
  return session;
}
