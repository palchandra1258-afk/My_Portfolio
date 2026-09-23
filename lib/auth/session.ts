// Session tokens — Phase 5 (Authentication).
//
// A session is a short, HMAC-signed statement of "this browser authenticated
// as the administrator, at this time, until that time". It is stateless: there
// is no session table, because there is one operator and no requirement to
// enumerate or revoke individual sessions from another device.
//
// SECURITY_AND_QUALITY.md §12–13: secure, HttpOnly, sensible SameSite,
// reasonable expiry, logout support. Cookie attributes live in
// lib/auth/cookie.ts; this module only mints and checks the token itself, so
// both halves stay unit-testable in isolation.
//
// Again composing standard primitives — `createHmac` (SHA-256) and
// `timingSafeEqual` — not implementing cryptography.
//
// Token layout: base64url(payload JSON) + "." + base64url(HMAC of that text).
// The payload is readable by anyone holding the cookie, which is fine: it
// contains a subject identifier and two timestamps, no secret. The signature
// is what makes it unforgeable.

import { createHmac, timingSafeEqual } from "node:crypto";

/** Eight hours: long enough for an editing session, short enough to bound a stolen cookie. */
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface SessionPayload {
  /** Subject — the administrator's identifier (their configured email). */
  sub: string;
  /** Issued at, seconds since epoch. */
  iat: number;
  /** Expires at, seconds since epoch. */
  exp: number;
}

export type SessionFailureReason =
  | "malformed"
  | "bad-signature"
  | "expired"
  | "not-yet-valid";

export type SessionVerification =
  | { valid: true; payload: SessionPayload }
  | { valid: false; reason: SessionFailureReason };

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(data).digest();
}

/**
 * Mint a signed session token.
 *
 * `now` is injectable so expiry behaviour is testable without manipulating the
 * system clock.
 */
export function createSessionToken(
  subject: string,
  secret: string,
  options: { now?: number; ttlSeconds?: number } = {},
): string {
  if (subject.length === 0) throw new Error("Refusing to mint a session with an empty subject.");
  if (secret.length === 0) throw new Error("Refusing to mint a session with an empty secret.");

  const now = options.now ?? Math.floor(Date.now() / 1000);
  const ttl = options.ttlSeconds ?? SESSION_TTL_SECONDS;
  const payload: SessionPayload = { sub: subject, iat: now, exp: now + ttl };

  const encoded = b64url(JSON.stringify(payload));
  return `${encoded}.${b64url(sign(encoded, secret))}`;
}

/**
 * Verify a token and return its payload.
 *
 * The signature is checked *before* the payload is trusted for anything,
 * including expiry — an attacker must not be able to influence control flow
 * with an unsigned payload. Comparison is constant-time.
 */
export function verifySessionToken(
  token: string | undefined | null,
  secret: string,
  options: { now?: number } = {},
): SessionVerification {
  if (!token || secret.length === 0) return { valid: false, reason: "malformed" };

  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, reason: "malformed" };

  const [encoded, signature] = parts;
  if (encoded.length === 0 || signature.length === 0) {
    return { valid: false, reason: "malformed" };
  }

  const expected = sign(encoded, secret);
  const provided = Buffer.from(signature, "base64url");
  if (provided.length !== expected.length) return { valid: false, reason: "bad-signature" };
  if (!timingSafeEqual(provided, expected)) return { valid: false, reason: "bad-signature" };

  let payload: SessionPayload;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as SessionPayload).sub !== "string" ||
      typeof (parsed as SessionPayload).iat !== "number" ||
      typeof (parsed as SessionPayload).exp !== "number"
    ) {
      return { valid: false, reason: "malformed" };
    }
    payload = parsed as SessionPayload;
  } catch {
    return { valid: false, reason: "malformed" };
  }

  const now = options.now ?? Math.floor(Date.now() / 1000);
  if (payload.exp <= now) return { valid: false, reason: "expired" };
  // A token issued in the future indicates clock skew or tampering with a
  // payload that nonetheless signed correctly — treat it as unusable.
  if (payload.iat > now + 60) return { valid: false, reason: "not-yet-valid" };

  return { valid: true, payload };
}
