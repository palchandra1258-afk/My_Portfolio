// Content source selection — Phase 7B-2 Step 4.
//
// The single place that reads CONTENT_SOURCE. Nothing under app/ or
// components/ checks the environment; they call the application-facing
// repository, which asks this module once.
//
// Pure and database-free by design: it resolves a mode from an environment
// object and reports how it got there. That makes every branch — including the
// production failure paths — testable in the default `npm test` suite with no
// PostgreSQL and no Next.js runtime.
//
// CONTENT_SOURCE is deliberately NOT a NEXT_PUBLIC_* variable. Which source
// the server reads from is not the browser's business, and exposing it would
// put a deployment detail into the client bundle.

export type ContentSource = "typescript" | "database";

export const CONTENT_SOURCE_VALUES: readonly ContentSource[] = ["typescript", "database"];

/** Why a mode was chosen — carried into the provenance log so a default is never mistaken for a decision. */
export type ContentSourceReason =
  | "explicit"
  | "development-default"
  | "test-default";

export interface ContentSourceDecision {
  source: ContentSource;
  reason: ContentSourceReason;
  /** The raw value seen, for logging. Never a secret — CONTENT_SOURCE is a mode name. */
  raw: string | undefined;
}

/** Thrown for a value or absence this module refuses to interpret. Never falls back silently. */
export class ContentSourceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentSourceConfigError";
  }
}

function isContentSource(value: string): value is ContentSource {
  return (CONTENT_SOURCE_VALUES as readonly string[]).includes(value);
}

export interface ResolveEnv {
  CONTENT_SOURCE?: string;
  NODE_ENV?: string;
}

/**
 * Decide which content source to use.
 *
 * - An explicit `typescript` or `database` always wins, in every environment.
 * - Outside production, an absent value defaults to `typescript`: `npm run dev`
 *   and `npm test` must not silently acquire a PostgreSQL dependency
 *   (requirement 9).
 * - In production an absent value is an error. Defaulting a production
 *   deployment to TypeScript is precisely the "silently serving stale content"
 *   failure this phase exists to prevent — the deployer has to say which
 *   source is intended.
 * - An unrecognized value is always an error, in every environment. A typo
 *   like `CONTENT_SOURCE=postgres` must not quietly read as TypeScript.
 */
export function resolveContentSource(env: ResolveEnv): ContentSourceDecision {
  const raw = env.CONTENT_SOURCE?.trim();
  const isProduction = env.NODE_ENV === "production";

  if (raw !== undefined && raw !== "") {
    if (!isContentSource(raw)) {
      throw new ContentSourceConfigError(
        `CONTENT_SOURCE="${raw}" is not a valid content source. ` +
          `Expected one of: ${CONTENT_SOURCE_VALUES.join(", ")}.`,
      );
    }
    return { source: raw, reason: "explicit", raw };
  }

  if (isProduction) {
    throw new ContentSourceConfigError(
      "CONTENT_SOURCE is not set. A production build or deployment must state its " +
        `content source explicitly (one of: ${CONTENT_SOURCE_VALUES.join(", ")}). ` +
        "Defaulting would risk serving TypeScript content while the database is " +
        "believed to be authoritative.",
    );
  }

  return {
    source: "typescript",
    reason: env.NODE_ENV === "test" ? "test-default" : "development-default",
    raw,
  };
}
