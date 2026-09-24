// Writing values safely into .env — Phase 5 fix.
//
// ── The problem this exists for ────────────────────────────────────────────
// Next.js loads .env through `@next/env`, which runs dotenv AND dotenv-expand.
// The expansion step treats `$NAME` inside a value as a reference to another
// variable and substitutes it — usually with nothing, because no such variable
// exists.
//
// A scrypt hash is `scrypt$N$r$p$salt$digest`. Every `$` in it is read as the
// start of a reference, so the whole value collapses. Measured against
// @next/env in this project: a 130-character hash arrived as 7 characters,
// and every quoting style behaved identically —
//
//   ADMIN_PASSWORD_HASH=scrypt$32768$8$1$<salt>$<digest>      -> "scrypt="
//   ADMIN_PASSWORD_HASH="scrypt$32768$8$1$<salt>$<digest>"    -> "scrypt="
//   ADMIN_PASSWORD_HASH='scrypt$32768$8$1$<salt>$<digest>'    -> "scrypt="
//
// Quoting does not help, because expansion happens after the quotes are
// stripped. Escaping each `$` as `\$` does — that is Next's documented escape,
// and all three quoting styles then round-trip the value exactly.
//
// ── Why this is not "just a .env formatting detail" ────────────────────────
// The failure is silent and misleading. The value still begins with the
// letters `scrypt`, so it looks vaguely right in a terminal, and the only
// visible symptom is the admin login reporting that sign-in "is not
// configured" — which reads like a missing variable rather than a mangled one.
//
// ── Scope ──────────────────────────────────────────────────────────────────
// This affects only the variables the Next.js process reads: ADMIN_EMAIL,
// ADMIN_PASSWORD_HASH, AUTH_SECRET and CONTENT_SOURCE. Of those, only the hash
// normally contains `$`. The `db:*` scripts are unaffected because they load
// .env through Node's built-in `--env-file`, which does no expansion at all —
// which is exactly why the database tooling kept working while login did not.
//
// Note the corollary: a value escaped for Next is NOT unescaped by Node's
// `--env-file`, which would hand back the literal backslashes. Do not read
// ADMIN_PASSWORD_HASH from a `--env-file` script without accounting for that.

/**
 * Escape a value so `@next/env` stores it verbatim.
 *
 * Only `$` needs escaping, and only when it is not already escaped — so
 * running this twice is safe.
 */
export function escapeDotenvValue(value: string): string {
  // Function replacement, not a string: `$` is special on the right-hand side
  // of String.replace and would otherwise be interpreted as a group reference.
  return value.replace(/(?<!\\)\$/g, () => "\\$");
}

/**
 * A ready-to-paste `.env` line.
 *
 * Unquoted on purpose. Quotes would not protect the value, and including them
 * invites the belief that they do.
 */
export function dotenvLine(key: string, value: string): string {
  return `${key}=${escapeDotenvValue(value)}`;
}

/**
 * Does this look like a scrypt hash that lost its separators to expansion?
 *
 * Used only to turn a confusing configuration error into an actionable one.
 * It never relaxes validation: a value matching this is still rejected.
 */
export function looksLikeExpandedScryptHash(value: string): boolean {
  return value.startsWith("scrypt") && !value.startsWith("scrypt$");
}
