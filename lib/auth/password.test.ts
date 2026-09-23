// Tests for password hashing — Phase 5.
//
// Database-free: `npm test` runs these with no PostgreSQL and no server.

import { describe, expect, it } from "vitest";

import { PasswordFormatError, hashPassword, verifyPassword } from "./password";

describe("hashPassword", () => {
  it("produces a self-describing scrypt string", async () => {
    const hash = await hashPassword("correct horse battery staple");
    const parts = hash.split("$");
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe("scrypt");
    expect(Number(parts[1])).toBeGreaterThanOrEqual(16384);
  });

  it("never contains the plaintext password", async () => {
    const password = "a-very-distinctive-passphrase";
    expect(await hashPassword(password)).not.toContain(password);
  });

  it("salts, so the same password hashes differently every time", async () => {
    const a = await hashPassword("same password");
    const b = await hashPassword("same password");
    expect(a).not.toBe(b);
    // ...and both still verify.
    expect(await verifyPassword("same password", a)).toBe(true);
    expect(await verifyPassword("same password", b)).toBe(true);
  });

  it("refuses an empty password", async () => {
    await expect(hashPassword("")).rejects.toThrow(PasswordFormatError);
  });
});

describe("verifyPassword", () => {
  it("accepts the correct password", async () => {
    const hash = await hashPassword("s3cure-enough-for-a-test");
    expect(await verifyPassword("s3cure-enough-for-a-test", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("the right one");
    expect(await verifyPassword("the wrong one", hash)).toBe(false);
  });

  it("rejects near-misses, including case and whitespace", async () => {
    const hash = await hashPassword("CaseSensitive Password");
    expect(await verifyPassword("casesensitive password", hash)).toBe(false);
    expect(await verifyPassword("CaseSensitive Password ", hash)).toBe(false);
    expect(await verifyPassword("CaseSensitive Passwor", hash)).toBe(false);
  });

  it("rejects an empty password against a real hash", async () => {
    const hash = await hashPassword("not empty");
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("throws on a malformed stored hash rather than returning false", async () => {
    // A corrupt hash is an operator problem. Returning false would look like a
    // wrong password and hide the misconfiguration.
    for (const bad of ["", "plaintext", "scrypt$only$three", "bcrypt$1$2$3$4$5"]) {
      await expect(verifyPassword("anything", bad)).rejects.toThrow(PasswordFormatError);
    }
  });

  it("throws when salt or digest is empty", async () => {
    await expect(verifyPassword("x", "scrypt$32768$8$1$$abc")).rejects.toThrow(PasswordFormatError);
    await expect(verifyPassword("x", "scrypt$32768$8$1$abc$")).rejects.toThrow(PasswordFormatError);
  });

  it("verifies a hash made with different cost parameters", async () => {
    // Self-describing format: raising the cost for new passwords must not
    // invalidate an existing stored hash.
    const legacy = "scrypt$16384$8$1$" + Buffer.from("0123456789abcdef").toString("base64");
    // Build a genuine low-cost hash the same way the module would.
    const { scrypt } = await import("node:crypto");
    const derived = await new Promise<Buffer>((resolve, reject) => {
      scrypt(
        "legacy-password",
        Buffer.from("0123456789abcdef"),
        64,
        { N: 16384, r: 8, p: 1, maxmem: 256 * 16384 * 8 },
        (error, key) => (error ? reject(error) : resolve(key)),
      );
    });
    const stored = `${legacy}$${derived.toString("base64")}`;

    expect(await verifyPassword("legacy-password", stored)).toBe(true);
    expect(await verifyPassword("wrong", stored)).toBe(false);
  });
});
