// Tests for login throttling — Phase 5.
//
// The two properties that matter: an attacker is slowed down, and the
// administrator can never be permanently locked out (SECURITY_AND_QUALITY.md
// §17). Time is injected, so none of this waits.

import { describe, expect, it } from "vitest";

import { LoginRateLimiter } from "./rate-limit";

const T0 = 1_800_000_000_000;

describe("LoginRateLimiter", () => {
  it("allows attempts up to the limit", () => {
    const limiter = new LoginRateLimiter(3, 60_000);
    expect(limiter.check("a@example.com", T0).allowed).toBe(true);
    limiter.recordFailure("a@example.com", T0);
    limiter.recordFailure("a@example.com", T0);
    expect(limiter.check("a@example.com", T0).allowed).toBe(true);
  });

  it("blocks once the limit is reached", () => {
    const limiter = new LoginRateLimiter(3, 60_000);
    for (let i = 0; i < 3; i++) limiter.recordFailure("a@example.com", T0);
    const result = limiter.check("a@example.com", T0);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("forgets after the window — never a permanent lockout", () => {
    const limiter = new LoginRateLimiter(3, 60_000);
    for (let i = 0; i < 3; i++) limiter.recordFailure("a@example.com", T0);
    expect(limiter.check("a@example.com", T0).allowed).toBe(false);
    expect(limiter.check("a@example.com", T0 + 60_000).allowed).toBe(true);
  });

  it("counts each identifier separately", () => {
    const limiter = new LoginRateLimiter(2, 60_000);
    limiter.recordFailure("a@example.com", T0);
    limiter.recordFailure("a@example.com", T0);
    expect(limiter.check("a@example.com", T0).allowed).toBe(false);
    // One identifier being throttled must not lock out another.
    expect(limiter.check("b@example.com", T0).allowed).toBe(true);
  });

  it("resets on success, so a correct password restores the budget", () => {
    const limiter = new LoginRateLimiter(3, 60_000);
    limiter.recordFailure("a@example.com", T0);
    limiter.recordFailure("a@example.com", T0);
    limiter.reset("a@example.com");
    expect(limiter.check("a@example.com", T0).remaining).toBe(3);
  });

  it("reports a shrinking retry window", () => {
    const limiter = new LoginRateLimiter(1, 60_000);
    limiter.recordFailure("a@example.com", T0);
    expect(limiter.check("a@example.com", T0).retryAfterMs).toBe(60_000);
    expect(limiter.check("a@example.com", T0 + 30_000).retryAfterMs).toBe(30_000);
  });

  it("prunes expired windows so memory stays bounded", () => {
    const limiter = new LoginRateLimiter(3, 60_000);
    limiter.recordFailure("a@example.com", T0);
    limiter.recordFailure("b@example.com", T0);
    expect(limiter.size).toBe(2);
    limiter.prune(T0 + 60_001);
    expect(limiter.size).toBe(0);
  });

  it("does not throttle a user who never fails", () => {
    const limiter = new LoginRateLimiter(3, 60_000);
    for (let i = 0; i < 50; i++) {
      expect(limiter.check("a@example.com", T0 + i).allowed).toBe(true);
    }
  });
});
