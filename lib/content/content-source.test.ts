// Unit tests for the CONTENT_SOURCE selection policy — Phase 7B-2 Step 4.
//
// Pure and database-free: resolveContentSource takes an env object rather
// than reading process.env directly, so every branch (including the
// production failure paths) is exercised here with no PostgreSQL and no
// Next.js runtime involved.

import { describe, expect, it } from "vitest";

import {
  ContentSourceConfigError,
  resolveContentSource,
} from "@/lib/content/content-source";

describe("resolveContentSource", () => {
  it("selects typescript when explicitly requested", () => {
    const decision = resolveContentSource({ CONTENT_SOURCE: "typescript", NODE_ENV: "production" });
    expect(decision).toEqual({ source: "typescript", reason: "explicit", raw: "typescript" });
  });

  it("selects database when explicitly requested", () => {
    const decision = resolveContentSource({ CONTENT_SOURCE: "database", NODE_ENV: "production" });
    expect(decision).toEqual({ source: "database", reason: "explicit", raw: "database" });
  });

  it("an explicit value wins in every environment, including development", () => {
    const decision = resolveContentSource({ CONTENT_SOURCE: "database", NODE_ENV: "development" });
    expect(decision.source).toBe("database");
    expect(decision.reason).toBe("explicit");
  });

  it("rejects an unrecognized value, in every environment", () => {
    expect(() => resolveContentSource({ CONTENT_SOURCE: "postgres", NODE_ENV: "development" })).toThrow(
      ContentSourceConfigError,
    );
    expect(() => resolveContentSource({ CONTENT_SOURCE: "postgres", NODE_ENV: "production" })).toThrow(
      ContentSourceConfigError,
    );
  });

  it("rejects a value that merely resembles a valid one (case, whitespace-only typos)", () => {
    expect(() => resolveContentSource({ CONTENT_SOURCE: "Database", NODE_ENV: "development" })).toThrow(
      ContentSourceConfigError,
    );
    expect(() => resolveContentSource({ CONTENT_SOURCE: "TYPESCRIPT", NODE_ENV: "development" })).toThrow(
      ContentSourceConfigError,
    );
  });

  it("defaults to typescript in development when the variable is absent", () => {
    const decision = resolveContentSource({ NODE_ENV: "development" });
    expect(decision).toEqual({ source: "typescript", reason: "development-default", raw: undefined });
  });

  it("defaults to typescript in test when the variable is absent", () => {
    const decision = resolveContentSource({ NODE_ENV: "test" });
    expect(decision).toEqual({ source: "typescript", reason: "test-default", raw: undefined });
  });

  it("defaults to typescript when NODE_ENV itself is unset (treated as non-production)", () => {
    const decision = resolveContentSource({});
    expect(decision.source).toBe("typescript");
    expect(decision.reason).toBe("development-default");
  });

  it("fails clearly in production when the variable is absent", () => {
    expect(() => resolveContentSource({ NODE_ENV: "production" })).toThrow(ContentSourceConfigError);
  });

  it("fails clearly in production when the variable is an empty string", () => {
    expect(() => resolveContentSource({ CONTENT_SOURCE: "", NODE_ENV: "production" })).toThrow(
      ContentSourceConfigError,
    );
  });

  it("treats a whitespace-only value the same as absent", () => {
    const decision = resolveContentSource({ CONTENT_SOURCE: "   ", NODE_ENV: "development" });
    expect(decision.source).toBe("typescript");
    expect(decision.reason).toBe("development-default");
  });

  it("trims surrounding whitespace from an otherwise valid value", () => {
    const decision = resolveContentSource({ CONTENT_SOURCE: "  database  ", NODE_ENV: "development" });
    expect(decision.source).toBe("database");
  });

  it("never silently selects typescript in production for an invalid value", () => {
    // Regression guard: a bug that swallowed the error and fell through to
    // the development-default branch would make this pass with "typescript".
    try {
      resolveContentSource({ CONTENT_SOURCE: "bogus", NODE_ENV: "production" });
      throw new Error("expected resolveContentSource to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ContentSourceConfigError);
    }
  });
});
