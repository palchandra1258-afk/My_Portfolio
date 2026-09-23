// Distinguishing "the database is not there" from "the database said no".
//
// This is the heart of the approved fallback policy, and the reason there is no
// `try { database() } catch { typescript() }` anywhere in this codebase. Those
// two situations look identical to a bare catch block and mean opposite things:
//
//   Case A — unavailable: no DATABASE_URL, connection refused, host
//            unreachable, authentication rejected, database does not exist.
//            Expected on a fresh clone and in CI. A static build may fall back
//            to TypeScript content, loudly.
//
//   Case B — query failure: the server answered, and the answer was an error —
//            a malformed query, a constraint violation, a missing table, a
//            timeout mid-statement. That is a bug. Falling back would paper
//            over it indefinitely, so it propagates.
//
// Anything this module does not positively recognize as unavailability is
// treated as Case B. The default is to fail, not to fall back.
//
// Pure and database-free: it inspects error shapes, imports no client, and is
// fully testable without PostgreSQL.

/** Prisma initialization codes that mean the server could not be reached or opened. */
const UNAVAILABLE_PRISMA_CODES = new Set([
  "P1000", // authentication failed
  "P1001", // can't reach database server
  "P1002", // database server reached but timed out
  "P1003", // database does not exist
  "P1008", // operation timed out (connection acquisition)
  "P1010", // access denied for user
  "P1011", // error opening a TLS connection
  "P1017", // server has closed the connection
]);

/** Socket-level codes from the underlying driver. */
const UNAVAILABLE_SYSCALL_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ECONNRESET",
  "EPIPE",
]);

/** Error names Prisma uses for "could not start talking to the database at all". */
const UNAVAILABLE_ERROR_NAMES = new Set([
  "PrismaClientInitializationError",
]);

/** Raised by lib/db.ts when DATABASE_URL is absent — unavailability, not a query failure. */
const MISSING_URL_MARKER = "DATABASE_URL is not set";

function codeOf(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const code = (value as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

/**
 * Walk an error and its `cause` chain looking for positive evidence that the
 * database could not be reached. Bounded so a cyclic cause cannot spin.
 */
export function isDatabaseUnavailable(error: unknown): boolean {
  let current: unknown = error;
  const seen = new Set<unknown>();

  for (let depth = 0; depth < 10 && current !== undefined && current !== null; depth++) {
    if (seen.has(current)) break;
    seen.add(current);

    if (current instanceof Error) {
      if (UNAVAILABLE_ERROR_NAMES.has(current.name)) return true;
      if (current.message.includes(MISSING_URL_MARKER)) return true;
    }

    const code = codeOf(current);
    if (code !== undefined) {
      if (UNAVAILABLE_PRISMA_CODES.has(code)) return true;
      if (UNAVAILABLE_SYSCALL_CODES.has(code)) return true;
    }

    current = current instanceof Error ? current.cause : undefined;
  }

  return false;
}

/** Thrown when a database read fails for a reason that must not be masked (Case B). */
export class ContentQueryError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ContentQueryError";
  }
}

/** Thrown when the database is unreachable and no fallback is permitted (Case A at runtime). */
export class ContentUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ContentUnavailableError";
  }
}
