// Administrator credentials and signing secret — Phase 5 (Authentication).
//
// Everything sensitive comes from the environment. No credential, hash, or
// secret is hardcoded, and none is ever sent to the client
// (SECURITY_AND_QUALITY.md §41). None of these are NEXT_PUBLIC_*.
//
//   ADMIN_EMAIL           the single administrator's login identifier
//   ADMIN_PASSWORD_HASH   scrypt hash from `npm run auth:hash` — never a plaintext password
//   AUTH_SECRET           HMAC key for session signatures
//
// Resolution is pure: it takes an environment object and returns a result, so
// every misconfiguration branch is testable without mutating process.env.

import { looksLikeExpandedScryptHash } from "@/lib/auth/env-file";

/** Minimum secret length. 32 chars of a random base64 string is ~192 bits. */
export const MIN_AUTH_SECRET_LENGTH = 32;

export interface AdminAuthConfig {
  adminEmail: string;
  adminPasswordHash: string;
  authSecret: string;
}

export class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigError";
  }
}

export interface AuthEnv {
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD_HASH?: string;
  AUTH_SECRET?: string;
}

/**
 * Read and validate the admin auth configuration.
 *
 * Throws `AuthConfigError` with an actionable message rather than returning a
 * half-configured object: an admin area that boots with a missing secret is
 * worse than one that refuses to start. Messages name the variable and how to
 * produce it — never the value.
 */
export function resolveAuthConfig(env: AuthEnv): AdminAuthConfig {
  const adminEmail = env.ADMIN_EMAIL?.trim();
  const adminPasswordHash = env.ADMIN_PASSWORD_HASH?.trim();
  const authSecret = env.AUTH_SECRET?.trim();

  if (!adminEmail) {
    throw new AuthConfigError(
      "ADMIN_EMAIL is not set. The admin area cannot authenticate anyone until it knows who the administrator is.",
    );
  }
  if (!adminPasswordHash) {
    throw new AuthConfigError(
      "ADMIN_PASSWORD_HASH is not set. Generate one with `npm run auth:hash` and put the result in .env — never a plaintext password.",
    );
  }
  if (!adminPasswordHash.startsWith("scrypt$")) {
    // Two very different mistakes produce a value that is not a scrypt hash,
    // and they need different advice. Validation is identical either way —
    // both are rejected — but the message names the actual cause.
    throw new AuthConfigError(
      looksLikeExpandedScryptHash(adminPasswordHash)
        ? "ADMIN_PASSWORD_HASH lost its `$` separators. Next.js expands `$NAME` inside .env " +
          "values, which collapses a scrypt hash. Escape every `$` as `\\$` in .env — quoting " +
          "the value does NOT help. `npm run auth:hash` prints the correctly escaped line."
        : "ADMIN_PASSWORD_HASH is not a scrypt hash. It must be the full `scrypt$...` string from `npm run auth:hash`, not a plaintext password.",
    );
  }
  if (!authSecret) {
    throw new AuthConfigError(
      "AUTH_SECRET is not set. Generate one with `node -e \"console.log(require('node:crypto').randomBytes(32).toString('base64url'))\"`.",
    );
  }
  if (authSecret.length < MIN_AUTH_SECRET_LENGTH) {
    throw new AuthConfigError(
      `AUTH_SECRET is too short (${authSecret.length} characters). Use at least ${MIN_AUTH_SECRET_LENGTH}.`,
    );
  }

  return { adminEmail, adminPasswordHash, authSecret };
}

/** True when the admin area is configured at all — lets routes 404/redirect instead of throwing. */
export function isAuthConfigured(env: AuthEnv): boolean {
  try {
    resolveAuthConfig(env);
    return true;
  } catch {
    return false;
  }
}
