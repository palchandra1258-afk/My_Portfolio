// Tests for .env value escaping — Phase 5 fix.
//
// The bug these pin down was a live outage of the admin login: an
// ADMIN_PASSWORD_HASH written into .env unescaped arrived at the application
// as a 7-character fragment, and the login page reported that sign-in was "not
// configured" — a message that points at a missing variable when the variable
// was in fact present and correct on disk.
//
// The important test is the last block. It does not simulate the expansion; it
// runs the real `@next/env` loader over a real temporary .env file, so it
// fails if Next's behaviour ever changes in either direction.
//
// Every value here is synthetic. No real hash, password or secret appears in
// this file.

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  dotenvLine,
  escapeDotenvValue,
  looksLikeExpandedScryptHash,
} from "./env-file";

/** Same shape as a real scrypt hash; the salt and digest are nonsense. */
const FAKE_HASH =
  "scrypt$32768$8$1$YWJjZGVmZ2hpamtsbW5v$c29tZWJhc2U2NGRpZ2VzdHZhbHVlaGVyZXBhZGRpbmc=";

describe("escapeDotenvValue", () => {
  it("escapes every dollar sign", () => {
    expect(escapeDotenvValue("a$b$c")).toBe("a\\$b\\$c");
  });

  it("escapes all five separators of a scrypt hash", () => {
    expect(escapeDotenvValue(FAKE_HASH).match(/\\\$/g)).toHaveLength(5);
  });

  it("leaves a value with no dollar sign untouched", () => {
    // AUTH_SECRET is base64url and ADMIN_EMAIL is an address; neither needs it.
    expect(escapeDotenvValue("Zm9vYmFyLWJhemA_cXV4")).toBe("Zm9vYmFyLWJhemA_cXV4");
    expect(escapeDotenvValue("admin@example.com")).toBe("admin@example.com");
  });

  it("is idempotent, so escaping an already-escaped value is harmless", () => {
    const once = escapeDotenvValue(FAKE_HASH);
    expect(escapeDotenvValue(once)).toBe(once);
  });
});

describe("dotenvLine", () => {
  it("produces an unquoted, escaped assignment", () => {
    expect(dotenvLine("ADMIN_PASSWORD_HASH", FAKE_HASH)).toBe(
      `ADMIN_PASSWORD_HASH=${escapeDotenvValue(FAKE_HASH)}`,
    );
  });

  it("does not wrap the value in quotes", () => {
    // Quotes would imply protection they do not provide — expansion happens
    // after dotenv strips them.
    expect(dotenvLine("K", FAKE_HASH)).not.toContain('"');
    expect(dotenvLine("K", FAKE_HASH)).not.toContain("'");
  });
});

describe("looksLikeExpandedScryptHash", () => {
  it("recognises a hash whose separators were eaten", () => {
    expect(looksLikeExpandedScryptHash("scrypt=")).toBe(true);
    expect(looksLikeExpandedScryptHash("scrypt")).toBe(true);
  });

  it("does not flag an intact hash", () => {
    expect(looksLikeExpandedScryptHash(FAKE_HASH)).toBe(false);
  });

  it("does not flag an unrelated value, such as a plaintext password", () => {
    expect(looksLikeExpandedScryptHash("hunter2")).toBe(false);
    expect(looksLikeExpandedScryptHash("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The regression test proper: real @next/env, real file.
// ---------------------------------------------------------------------------

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  delete process.env.UNESCAPED;
  delete process.env.ESCAPED;
  delete process.env.QUOTED;
});

async function loadThrough(nextEnvFile: string): Promise<NodeJS.ProcessEnv> {
  const dir = mkdtempSync(join(tmpdir(), "env-escape-"));
  dirs.push(dir);
  writeFileSync(join(dir, ".env"), nextEnvFile);

  const { loadEnvConfig } = await import("@next/env");
  // `forceReload` — @next/env memoises, and these cases must not share a cache.
  loadEnvConfig(dir, true, { info: () => {}, error: () => {} }, true);
  return process.env;
}

describe("@next/env round-trip", () => {
  it("destroys an unescaped scrypt hash — the bug this fix exists for", async () => {
    const env = await loadThrough(`UNESCAPED=${FAKE_HASH}\n`);

    expect(env.UNESCAPED).not.toBe(FAKE_HASH);
    // Specifically: it no longer parses as a scrypt hash at all.
    expect(env.UNESCAPED?.startsWith("scrypt$")).toBe(false);
    expect(env.UNESCAPED!.length).toBeLessThan(FAKE_HASH.length);
    expect(looksLikeExpandedScryptHash(env.UNESCAPED!)).toBe(true);
  });

  it("is not fixed by quoting, which is the intuitive but wrong workaround", async () => {
    const env = await loadThrough(`QUOTED="${FAKE_HASH}"\n`);
    expect(env.QUOTED).not.toBe(FAKE_HASH);
  });

  it("round-trips the hash exactly when escaped with dotenvLine", async () => {
    const env = await loadThrough(`${dotenvLine("ESCAPED", FAKE_HASH)}\n`);
    expect(env.ESCAPED).toBe(FAKE_HASH);
  });
});
