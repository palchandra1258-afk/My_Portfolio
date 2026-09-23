// Database-backed profile repository — Phase 7B-2 Step 2.
//
// The future read path. NOT yet imported by any page, component, route, or
// metadata function: lib/repositories/profile-repository.ts (synchronous,
// TypeScript-backed) is still what the application reads through.
//
// ── One accessor, not eight ────────────────────────────────────────────────
// The old repository exposes eight separate constants (`personal`,
// `education`, … `additionalVerifiedSkills`) because they are eight module
// exports of content/resume-data.ts — free to read individually. In the
// database they are one `profile` row plus six child tables, fetched in a
// single query with an `include`. Mirroring the old shape as eight accessors
// would mean eight round-trips to render one page: app/page.tsx alone reads
// five of them. So this module exposes one consolidated `getProfile()`
// (approved decision J-5), cached per render, and callers destructure.
//
// The returned shape is identical to the TypeScript source, field for field —
// including the two things that are easy to lose and load-bearing:
//   - `skills` key order, rebuilt from display_order by first-appearance
//   - `additionalVerifiedSkills`, the GitHub-verified list kept separate so
//     the site never implies those skills came from the resume
// Both are reconstructed in lib/repositories/read-model.ts and verified by
// `npm run db:verify`.
//
// See project-repository.server.ts for why `server-only` is here and why
// nothing in this module catches.

import "server-only";

import { cache } from "react";

import type { DatabaseProfile } from "@/lib/content/canonical";
import { prisma } from "@/lib/db";
import { readProfileFromDatabase } from "@/lib/repositories/read-model";

export type { DatabaseProfile as Profile };

/**
 * The complete profile: `personal`, `education`, `experience`, `achievements`,
 * `financeAreas`, `technologyXFinanceAreas`, `skills` and
 * `additionalVerifiedSkills` — the same eight groups the TypeScript profile
 * repository exports, in one cached read.
 *
 * Returns `null` when the singleton row is absent. The row's existence is
 * guaranteed by the import process rather than by a constraint (the
 * `profile_singleton` CHECK makes a second row impossible but cannot force one
 * to exist), so an empty table is a real, representable state and the caller
 * decides what it means.
 */
export const getProfile = cache(async (): Promise<DatabaseProfile | null> => {
  return readProfileFromDatabase(prisma);
});
