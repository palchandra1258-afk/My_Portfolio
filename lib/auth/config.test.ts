// Tests for admin auth configuration — Phase 5.
//
// Every branch here is a misconfiguration that must fail loudly at startup
// rather than produce a half-open admin area.

import { describe, expect, it } from "vitest";

import { AuthConfigError, isAuthConfigured, resolveAuthConfig } from "./config";

const VALID = {
  ADMIN_EMAIL: "admin@example.com",
  ADMIN_PASSWORD_HASH: "scrypt$32768$8$1$c2FsdA==$aGFzaA==",
  AUTH_SECRET: "a-secret-that-is-long-enough-for-hmac",
};

describe("resolveAuthConfig", () => {
  it("accepts a complete configuration", () => {
    expect(resolveAuthConfig(VALID)).toEqual({
      adminEmail: "admin@example.com",
      adminPasswordHash: VALID.ADMIN_PASSWORD_HASH,
      authSecret: VALID.AUTH_SECRET,
    });
  });

  it("rejects a missing ADMIN_EMAIL", () => {
    expect(() => resolveAuthConfig({ ...VALID, ADMIN_EMAIL: undefined })).toThrow(AuthConfigError);
    expect(() => resolveAuthConfig({ ...VALID, ADMIN_EMAIL: "   " })).toThrow(AuthConfigError);
  });

  it("rejects a missing password hash", () => {
    expect(() => resolveAuthConfig({ ...VALID, ADMIN_PASSWORD_HASH: undefined })).toThrow(
      AuthConfigError,
    );
  });

  it("rejects a plaintext password in ADMIN_PASSWORD_HASH", () => {
    // The mistake most likely to happen in practice, and the most damaging.
    expect(() => resolveAuthConfig({ ...VALID, ADMIN_PASSWORD_HASH: "hunter2" })).toThrow(
      /not a scrypt hash/i,
    );
  });

  it("rejects a hash whose $ separators were eaten by .env expansion", () => {
    // The real failure: Next.js expands `$NAME` in .env values, so an
    // unescaped scrypt hash arrives as a short fragment. It must still be
    // rejected — and the message must point at the escaping, not at a
    // missing variable, because the variable was present and correct on disk.
    expect(() => resolveAuthConfig({ ...VALID, ADMIN_PASSWORD_HASH: "scrypt=" })).toThrow(
      AuthConfigError,
    );
    expect(() => resolveAuthConfig({ ...VALID, ADMIN_PASSWORD_HASH: "scrypt=" })).toThrow(
      /escape every `\$` as/i,
    );
  });

  it("still gives the plaintext-password advice for a value that is not a mangled hash", () => {
    // The two causes must not be conflated: "hunter2" is not an escaping
    // problem, and telling the operator to escape it would be wrong.
    expect(() => resolveAuthConfig({ ...VALID, ADMIN_PASSWORD_HASH: "hunter2" })).not.toThrow(
      /escape every/i,
    );
  });

  it("names no secret value in any error message", () => {
    // Messages are logged, and the login page tells the operator to read them.
    const secretish = "scrypt=";
    try {
      resolveAuthConfig({ ...VALID, ADMIN_PASSWORD_HASH: secretish, AUTH_SECRET: "sh0rt-secret" });
    } catch (error) {
      expect((error as Error).message).not.toContain(VALID.AUTH_SECRET);
      expect((error as Error).message).not.toContain(VALID.ADMIN_PASSWORD_HASH);
    }
  });

  it("rejects a missing AUTH_SECRET", () => {
    expect(() => resolveAuthConfig({ ...VALID, AUTH_SECRET: undefined })).toThrow(AuthConfigError);
  });

  it("rejects a short AUTH_SECRET", () => {
    expect(() => resolveAuthConfig({ ...VALID, AUTH_SECRET: "too-short" })).toThrow(/too short/i);
  });

  it("never puts a secret value in the error message", () => {
    // Error text can reach logs and screens; it must name the variable, not
    // reveal what was configured.
    try {
      resolveAuthConfig({ ...VALID, AUTH_SECRET: "short-secret-value" });
      throw new Error("expected a throw");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).not.toContain("short-secret-value");
      expect(message).toContain("AUTH_SECRET");
    }
  });

  it("trims surrounding whitespace", () => {
    const config = resolveAuthConfig({
      ADMIN_EMAIL: "  admin@example.com  ",
      ADMIN_PASSWORD_HASH: `  ${VALID.ADMIN_PASSWORD_HASH}  `,
      AUTH_SECRET: `  ${VALID.AUTH_SECRET}  `,
    });
    expect(config.adminEmail).toBe("admin@example.com");
  });
});

describe("isAuthConfigured", () => {
  it("is true for a valid configuration and false otherwise", () => {
    expect(isAuthConfigured(VALID)).toBe(true);
    expect(isAuthConfigured({})).toBe(false);
    expect(isAuthConfigured({ ...VALID, AUTH_SECRET: "x" })).toBe(false);
  });
});
