// Login throttling — Phase 5 (Authentication).
//
// SECURITY_AND_QUALITY.md §16–17: protect authentication endpoints from
// repeated failed attempts, but "avoid permanent lockouts that can create
// denial-of-service problems for the administrator". So this is a sliding
// window that forgets, never a lockout that needs clearing.
//
// §16 also says not to add rate limiting everywhere without an identified
// need. Login is the one endpoint named in that list that exists today, so it
// is the only thing throttled.
//
// ── Known limitation, stated rather than hidden ────────────────────────────
// The window lives in process memory. That is sufficient for a single-instance
// deployment and for local development, and it fails safe (a restart clears
// the counters, which slows an attacker down but never locks the operator
// out). It does NOT coordinate across multiple instances — if this ever runs
// behind more than one server, throttling must move to shared storage.
//
// Pure apart from the clock, which is injectable, so the whole window is
// testable without waiting.

/** Failed attempts allowed inside the window before refusing. */
export const MAX_ATTEMPTS = 5;

/** Sliding window length. */
export const WINDOW_MS = 15 * 60 * 1000;

interface Attempt {
  count: number;
  /** When the current window started, ms since epoch. */
  windowStart: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Attempts left in the current window; 0 once blocked. */
  remaining: number;
  /** Ms until the window resets. 0 when not blocked. */
  retryAfterMs: number;
}

/**
 * A single throttle. Instantiable so tests get isolation and so a future
 * endpoint can have its own budget rather than sharing login's.
 */
export class LoginRateLimiter {
  private readonly attempts = new Map<string, Attempt>();

  constructor(
    private readonly maxAttempts: number = MAX_ATTEMPTS,
    private readonly windowMs: number = WINDOW_MS,
  ) {}

  /** Check without recording. Call before attempting authentication. */
  check(key: string, now: number = Date.now()): RateLimitResult {
    const entry = this.attempts.get(key);
    if (entry === undefined || now - entry.windowStart >= this.windowMs) {
      return { allowed: true, remaining: this.maxAttempts, retryAfterMs: 0 };
    }
    if (entry.count >= this.maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: entry.windowStart + this.windowMs - now,
      };
    }
    return {
      allowed: true,
      remaining: this.maxAttempts - entry.count,
      retryAfterMs: 0,
    };
  }

  /** Record a failed attempt. Only failures count, so normal use never throttles. */
  recordFailure(key: string, now: number = Date.now()): RateLimitResult {
    const entry = this.attempts.get(key);
    if (entry === undefined || now - entry.windowStart >= this.windowMs) {
      this.attempts.set(key, { count: 1, windowStart: now });
      return { allowed: true, remaining: this.maxAttempts - 1, retryAfterMs: 0 };
    }
    entry.count += 1;
    return this.check(key, now);
  }

  /** Clear a key's counter. Called on successful login so a good password resets the budget. */
  reset(key: string): void {
    this.attempts.delete(key);
  }

  /** Drop expired windows. Bounded memory without a background timer. */
  prune(now: number = Date.now()): void {
    for (const [key, entry] of this.attempts) {
      if (now - entry.windowStart >= this.windowMs) this.attempts.delete(key);
    }
  }

  /** Test seam. */
  get size(): number {
    return this.attempts.size;
  }
}

/** Process-wide limiter for the admin login action. */
export const loginRateLimiter = new LoginRateLimiter();
