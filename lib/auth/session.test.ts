// Tests for session tokens — Phase 5.
//
// The security claims worth pinning down are: a token cannot be forged without
// the secret, a tampered payload is rejected, and an expired token stops
// working. Each has a test that fails loudly if the property is lost.

import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { SESSION_TTL_SECONDS, createSessionToken, verifySessionToken } from "./session";

const SECRET = "test-secret-at-least-32-characters-long!";
const OTHER_SECRET = "a-completely-different-secret-value-32+!";
const NOW = 1_800_000_000;

describe("createSessionToken", () => {
  it("returns a two-part token", () => {
    const token = createSessionToken("admin@example.com", SECRET, { now: NOW });
    expect(token.split(".")).toHaveLength(2);
  });

  it("sets expiry from the TTL", () => {
    const token = createSessionToken("admin@example.com", SECRET, { now: NOW });
    const result = verifySessionToken(token, SECRET, { now: NOW });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.iat).toBe(NOW);
      expect(result.payload.exp).toBe(NOW + SESSION_TTL_SECONDS);
      expect(result.payload.sub).toBe("admin@example.com");
    }
  });

  it("refuses an empty subject or secret", () => {
    expect(() => createSessionToken("", SECRET)).toThrow();
    expect(() => createSessionToken("admin@example.com", "")).toThrow();
  });
});

describe("verifySessionToken", () => {
  it("accepts a token it just minted", () => {
    const token = createSessionToken("admin@example.com", SECRET, { now: NOW });
    expect(verifySessionToken(token, SECRET, { now: NOW }).valid).toBe(true);
  });

  it("rejects a token signed with a different secret", () => {
    const token = createSessionToken("admin@example.com", OTHER_SECRET, { now: NOW });
    const result = verifySessionToken(token, SECRET, { now: NOW });
    expect(result).toEqual({ valid: false, reason: "bad-signature" });
  });

  it("rejects a tampered payload even when the signature is well-formed", () => {
    // The attack this prevents: swap the subject, keep the old signature.
    const token = createSessionToken("admin@example.com", SECRET, { now: NOW });
    const [, signature] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: "attacker@example.com", iat: NOW, exp: NOW + 3600 }),
    ).toString("base64url");
    const forged = `${forgedPayload}.${signature}`;

    const result = verifySessionToken(forged, SECRET, { now: NOW });
    expect(result).toEqual({ valid: false, reason: "bad-signature" });
  });

  it("rejects an expired token", () => {
    const token = createSessionToken("admin@example.com", SECRET, { now: NOW });
    const result = verifySessionToken(token, SECRET, { now: NOW + SESSION_TTL_SECONDS + 1 });
    expect(result).toEqual({ valid: false, reason: "expired" });
  });

  it("rejects exactly at the expiry second", () => {
    const token = createSessionToken("admin@example.com", SECRET, { now: NOW });
    const at = verifySessionToken(token, SECRET, { now: NOW + SESSION_TTL_SECONDS });
    expect(at).toEqual({ valid: false, reason: "expired" });
    // One second earlier is still valid.
    expect(verifySessionToken(token, SECRET, { now: NOW + SESSION_TTL_SECONDS - 1 }).valid).toBe(true);
  });

  it("rejects a token issued far in the future", () => {
    const token = createSessionToken("admin@example.com", SECRET, { now: NOW + 3600 });
    const result = verifySessionToken(token, SECRET, { now: NOW });
    expect(result).toEqual({ valid: false, reason: "not-yet-valid" });
  });

  it("tolerates small clock skew", () => {
    const token = createSessionToken("admin@example.com", SECRET, { now: NOW + 30 });
    expect(verifySessionToken(token, SECRET, { now: NOW }).valid).toBe(true);
  });

  it("rejects missing, empty and malformed tokens", () => {
    for (const bad of [undefined, null, "", "no-dot", "a.b.c", ".", "abc."]) {
      const result = verifySessionToken(bad, SECRET, { now: NOW });
      expect(result.valid).toBe(false);
    }
  });

  it("rejects a correctly-signed payload that is not a session object", () => {
    // Signed, but the payload shape is wrong — must not be trusted.
    const encoded = Buffer.from(JSON.stringify({ hello: "world" })).toString("base64url");
    const sig = createHmac("sha256", SECRET).update(encoded).digest().toString("base64url");
    const result = verifySessionToken(`${encoded}.${sig}`, SECRET, { now: NOW });
    expect(result).toEqual({ valid: false, reason: "malformed" });
  });

  it("rejects when no secret is available", () => {
    const token = createSessionToken("admin@example.com", SECRET, { now: NOW });
    expect(verifySessionToken(token, "", { now: NOW }).valid).toBe(false);
  });
});
