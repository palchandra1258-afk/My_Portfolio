// Password hashing and verification — Phase 5 (Authentication).
//
// SECURITY_AND_QUALITY.md §15: never store plaintext passwords, use a modern
// password hashing mechanism. §5: do not create custom authentication
// cryptography.
//
// This module composes vetted primitives from Node's standard library —
// `scrypt` (RFC 7914, a memory-hard KDF designed for password storage) and
// `timingSafeEqual` — rather than inventing anything. No cipher, KDF, or MAC
// is implemented here; only parameter selection and encoding.
//
// Why not an auth library: this portfolio has exactly one administrator, no
// registration, no password reset, no OAuth, and no multi-tenancy. Auth.js and
// similar frameworks exist to solve provider federation and account lifecycle,
// none of which applies. CLAUDE.md §16 asks whether an existing dependency
// solves the problem before adding one — `node:crypto` does, so this adds zero
// dependencies. That decision is recorded here so it can be revisited if the
// requirements ever grow beyond a single operator.
//
// Pure and dependency-free, so it is fully unit-testable without a database,
// a server, or a running Next.js.

import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Promise wrapper around `scrypt`.
 *
 * Hand-written rather than `promisify(scrypt)` because promisify collapses the
 * overloads and drops the options parameter, which is exactly where the cost
 * parameters live.
 */
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

/**
 * scrypt cost parameters. N=2^15 with r=8 is the widely-cited interactive
 * -login baseline: roughly 32 MiB of memory per hash, which makes large-scale
 * offline cracking expensive while keeping a single login well under a second.
 */
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** Identifies the hashing scheme so the format can evolve without ambiguity. */
const SCHEME = "scrypt";

/** Thrown when a stored hash cannot be parsed. Never carries the hash itself. */
export class PasswordFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordFormatError";
  }
}

/**
 * Hash a password for storage.
 *
 * Returns `scrypt$N$r$p$<salt base64>$<hash base64>` — self-describing, so a
 * hash created with one cost parameter still verifies after the parameters are
 * raised for new passwords.
 */
export async function hashPassword(password: string): Promise<string> {
  if (password.length === 0) {
    throw new PasswordFormatError("Refusing to hash an empty password.");
  }
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    // scrypt needs roughly 128 * N * r bytes; Node's default 32 MiB cap is
    // exactly at the limit for these parameters, so raise it explicitly.
    maxmem: 256 * SCRYPT_N * SCRYPT_R,
  });

  return [
    SCHEME,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

interface ParsedHash {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
}

function parseHash(stored: string): ParsedHash {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== SCHEME) {
    throw new PasswordFormatError(
      `Stored password hash is not in the expected ${SCHEME}$N$r$p$salt$hash format.`,
    );
  }
  const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts;
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    throw new PasswordFormatError("Stored password hash has non-integer scrypt parameters.");
  }
  const salt = Buffer.from(saltRaw, "base64");
  const hash = Buffer.from(hashRaw, "base64");
  if (salt.length === 0 || hash.length === 0) {
    throw new PasswordFormatError("Stored password hash has an empty salt or digest.");
  }
  return { N, r, p, salt, hash };
}

/**
 * Verify a candidate password against a stored hash.
 *
 * Returns false for a wrong password and throws only when the *stored* hash is
 * unusable — a misconfiguration the operator needs to see, not an auth failure
 * to report to the client.
 *
 * The comparison is constant-time. A wrong-length digest is rejected before
 * comparison because `timingSafeEqual` throws on length mismatch; that length
 * is a property of the stored hash, not of the submitted password, so it leaks
 * nothing about the secret.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const { N, r, p, salt, hash } = parseHash(stored);

  const derived = await scryptAsync(password, salt, hash.length, {
    N,
    r,
    p,
    maxmem: 256 * N * r,
  });

  if (derived.length !== hash.length) return false;
  return timingSafeEqual(derived, hash);
}
