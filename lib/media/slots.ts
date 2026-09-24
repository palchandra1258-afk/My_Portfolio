// The managed-asset vocabulary — Phase 8.
//
// Pure, and deliberately in its own module rather than beside the repository:
// translating a URL segment to a slot is the first thing the public route
// handler does, and it must not drag a Prisma client into anything that needs
// only the mapping. That also keeps the route testable without a database.
//
// These two functions are the reason a URL segment can never reach a
// filesystem path or a row id. The segment is matched against a closed
// vocabulary; anything else is null, and the caller answers 404.

/** A managed asset slot, spelled as the database enum spells it. */
export type MediaSlotName = "profile_photo" | "resume";

/** The slot's spelling in a URL. Matches the enum's database mapping. */
export function slotPath(slot: MediaSlotName): string {
  return slot === "profile_photo" ? "profile-photo" : "resume";
}

/**
 * Parse a URL segment back to a slot. Null for anything unrecognized.
 *
 * An exact match on one of two literals — not a prefix test, not a
 * normalization, not a lookup into an object that could inherit from
 * Object.prototype. `"constructor"`, `"../../etc/passwd"` and
 * `"profile-photo.jpg"` all return null.
 */
export function slotFromPath(segment: string): MediaSlotName | null {
  if (segment === "profile-photo") return "profile_photo";
  if (segment === "resume") return "resume";
  return null;
}
