"use server";

// Login and logout server actions — Phase 5.
//
// Server Actions are separately addressable HTTP endpoints, so every one of
// them establishes its own identity and validates its own input. Nothing here
// trusts anything the client says beyond the two submitted strings.
//
// SECURITY_AND_QUALITY.md §28 (input validation), §15 (password handling),
// §16–17 (abuse protection), §12 (session security).

import { redirect } from "next/navigation";

import { resolveAuthConfig } from "@/lib/auth/config";
import { verifyPassword } from "@/lib/auth/password";
import { loginRateLimiter } from "@/lib/auth/rate-limit";
import { ADMIN_HOME_PATH, LOGIN_PATH, endSession, startSession } from "@/lib/auth/session.server";

export interface LoginState {
  error: string | null;
}

/** Maximum accepted field lengths — bounds work before any hashing happens. */
const MAX_EMAIL_LENGTH = 320;
const MAX_PASSWORD_LENGTH = 1024;

/**
 * One message for every credential failure.
 *
 * Distinguishing "no such user" from "wrong password" would confirm which
 * email is the administrator's. There is exactly one account, so any detail
 * here is a gift to an attacker and no help to the operator.
 */
const GENERIC_FAILURE = "Incorrect email or password.";

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");

  // Reject anything that is not a plain string field before touching it —
  // FormData values can also be File objects.
  if (typeof emailRaw !== "string" || typeof passwordRaw !== "string") {
    return { error: GENERIC_FAILURE };
  }

  const email = emailRaw.trim().toLowerCase();
  const password = passwordRaw;

  if (
    email.length === 0 ||
    email.length > MAX_EMAIL_LENGTH ||
    password.length === 0 ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return { error: GENERIC_FAILURE };
  }

  let config;
  try {
    config = resolveAuthConfig({
      ADMIN_EMAIL: process.env.ADMIN_EMAIL,
      ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
      AUTH_SECRET: process.env.AUTH_SECRET,
    });
  } catch {
    // Misconfiguration is an operator problem, not an authentication result.
    // The detail is deliberately withheld from the browser; the thrown message
    // is visible in server logs via resolveAuthConfig.
    return { error: "Administrator sign-in is not configured on this deployment." };
  }

  // Throttle per submitted identifier. Checked before hashing so a flood of
  // attempts cannot be used to burn CPU on scrypt.
  const throttle = loginRateLimiter.check(email);
  if (!throttle.allowed) {
    const minutes = Math.max(1, Math.ceil(throttle.retryAfterMs / 60000));
    return { error: `Too many failed attempts. Try again in about ${minutes} minute(s).` };
  }

  const expectedEmail = config.adminEmail.trim().toLowerCase();

  let passwordMatches = false;
  try {
    // Always run the hash comparison, even when the email is wrong, so the
    // response time does not reveal whether the identifier exists.
    passwordMatches = await verifyPassword(password, config.adminPasswordHash);
  } catch {
    return { error: "Administrator sign-in is not configured on this deployment." };
  }

  if (email !== expectedEmail || !passwordMatches) {
    loginRateLimiter.recordFailure(email);
    return { error: GENERIC_FAILURE };
  }

  loginRateLimiter.reset(email);
  loginRateLimiter.prune();
  await startSession(expectedEmail);

  // redirect() throws to unwind, so it must sit outside any try/catch above.
  redirect(ADMIN_HOME_PATH);
}

export async function logout(): Promise<void> {
  await endSession();
  redirect(LOGIN_PATH);
}
