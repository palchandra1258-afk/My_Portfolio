// Unit tests for the availability classifier — Phase 7B-2 Step 4.
//
// This is the boundary between approved fallback Case A (unavailable, may
// fall back during a build) and Case B (query failure, must never fall
// back). Getting this wrong in either direction defeats the whole policy, so
// every positively-recognized signal is tested individually, alongside the
// default-to-"not unavailable" behavior for anything else.

import { describe, expect, it } from "vitest";

import { isDatabaseUnavailable } from "@/lib/content/database-availability";

function prismaError(code: string): Error & { code: string } {
  const error = new Error(`Prisma error ${code}`) as Error & { code: string };
  error.code = code;
  return error;
}

function syscallError(code: string): Error & { code: string } {
  const error = new Error(code) as Error & { code: string };
  error.code = code;
  return error;
}

describe("isDatabaseUnavailable", () => {
  it("recognizes Prisma initialization error codes", () => {
    for (const code of ["P1000", "P1001", "P1002", "P1003", "P1008", "P1010", "P1011", "P1017"]) {
      expect(isDatabaseUnavailable(prismaError(code)), code).toBe(true);
    }
  });

  it("recognizes socket-level connection codes", () => {
    for (const code of ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "EAI_AGAIN", "EHOSTUNREACH", "ENETUNREACH", "ECONNRESET", "EPIPE"]) {
      expect(isDatabaseUnavailable(syscallError(code)), code).toBe(true);
    }
  });

  it("recognizes PrismaClientInitializationError by name even without a code", () => {
    const error = new Error("could not connect");
    error.name = "PrismaClientInitializationError";
    expect(isDatabaseUnavailable(error)).toBe(true);
  });

  it("recognizes the lib/db.ts missing-DATABASE_URL message", () => {
    const error = new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and provide a real PostgreSQL connection string before using lib/db.ts.",
    );
    expect(isDatabaseUnavailable(error)).toBe(true);
  });

  it("does not classify an unrelated Prisma error code as unavailability", () => {
    // P2002 is a unique-constraint violation — the server answered. Case B.
    expect(isDatabaseUnavailable(prismaError("P2002"))).toBe(false);
  });

  it("does not classify a plain query error as unavailability", () => {
    expect(isDatabaseUnavailable(new Error('relation "projects" does not exist'))).toBe(false);
  });

  it("does not classify a non-Error value as unavailability", () => {
    expect(isDatabaseUnavailable("some string")).toBe(false);
    expect(isDatabaseUnavailable(undefined)).toBe(false);
    expect(isDatabaseUnavailable(null)).toBe(false);
    expect(isDatabaseUnavailable(42)).toBe(false);
  });

  it("walks the cause chain to find a wrapped unavailability signal", () => {
    const root = syscallError("ECONNREFUSED");
    const wrapped = new Error("failed to read projects", { cause: root });
    expect(isDatabaseUnavailable(wrapped)).toBe(true);
  });

  it("does not find unavailability through a cause chain that never has one", () => {
    const root = new Error("syntax error in SQL");
    const wrapped = new Error("failed to read projects", { cause: root });
    expect(isDatabaseUnavailable(wrapped)).toBe(false);
  });

  it("is bounded against a cyclic cause chain", () => {
    const a: Error & { cause?: unknown } = new Error("a");
    const b: Error & { cause?: unknown } = new Error("b");
    a.cause = b;
    b.cause = a;
    expect(() => isDatabaseUnavailable(a)).not.toThrow();
    expect(isDatabaseUnavailable(a)).toBe(false);
  });
});
