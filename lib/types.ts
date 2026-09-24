// Project-level evidence-confidence axis — "how well-supported is this
// project's claim set as a whole?" Unchanged since the original model:
// values, meaning, and every existing assignment are preserved as-is.
export type VerificationStatus =
  | "verified"
  | "partially-verified"
  | "self-reported"
  | "unpublished"
  | "needs-information"
  // Retained for backward compatibility only. No project currently uses
  // either value — project lifecycle is tracked by `ProjectStatus` below,
  // not here. Do not assign these to new projects.
  | "in-development"
  | "planned";

export type ProjectCategory =
  | "featured"
  | "supporting"
  | "research"
  | "coming-soon";

export type ProjectStatus =
  | "Completed"
  | "Active Development"
  | "Internship Project"
  | "Research / Experimental"
  | "Repository Placeholder"
  | "Unpublished";

// Metric-level classification axis — "what kind of number is this?"
// The original four values keep their exact original meaning; the four
// additional values only apply where a metric doesn't fit those cases
// (e.g. a number sourced from an experiment but not yet independently
// checked, a calculated ratio, an input condition, or a disputed value).
// Never let a target or an unconfirmed number read as an achieved result.
export type MetricStatus =
  | "verified-result"
  | "target"
  | "scope"
  | "dataset-fact"
  | "measured"
  | "derived"
  | "assumption"
  | "needs-verification";

export interface Metric {
  label: string;
  value: string;
  kind: MetricStatus;
  note?: string;
  /** Optional pointer to the artifact/doc this number came from. Omit rather than guess. */
  source?: string;
}

// Implementation/lifecycle axis for a specific feature-level claim —
// "what stage of existence is this particular component in?" Distinct from
// both `ProjectStatus` (whole-project lifecycle) and `VerificationStatus`
// (whole-project evidence confidence).
export type ImplementationStatus =
  | "implemented"
  | "experimental"
  | "specified"
  | "in-development"
  | "planned"
  | "future";

export interface ImplementationNote {
  label: string;
  status: ImplementationStatus;
}

/**
 * A project as authored and as the admin sees it — the full record, including
 * the internal-only fields.
 *
 * Public pages must NOT use this type. They use `PublicProject` below, which
 * omits `verificationNotes`. See lib/content/public-project.ts.
 */
export interface Project {
  slug: string;
  title: string;
  alternateNames?: string[];
  category: ProjectCategory;
  status: ProjectStatus;
  featured: boolean;
  shortDescription: string;
  problem?: string;
  approach?: string;
  architecture?: string;
  technologies: string[];
  results?: string[];
  metrics: Metric[];
  githubUrl?: string;
  demoUrl?: string;
  evidenceStatus: VerificationStatus;
  /**
   * Internal editorial record of what was actually checked and what was not.
   *
   * **Admin-only. Never rendered publicly, in any form.** It is working
   * material — it names what is unverified, which repositories were or were
   * not located, and which claims are still the owner's word — and that is a
   * note to the portfolio's author, not copy for a visitor.
   *
   * It is stored in PostgreSQL and editable in the admin project editor. The
   * public read path cannot reach it: `PublicProject` omits it, and
   * `toPublicProject()` strips it at runtime. See lib/content/public-project.ts.
   */
  verificationNotes: string;
  whatIsWorking?: string[];
  whatIsInDevelopment?: string[];
  /** Optional structured superset of whatIsWorking/whatIsInDevelopment. Not yet populated on any project. */
  implementationNotes?: ImplementationNote[];
  relatedTo?: { slug: string; note: string }[];
  source: "Resume" | "GitHub" | "Both";
}

/**
 * A project as the public site may see it.
 *
 * Structurally identical to `Project` minus `verificationNotes`. Public pages,
 * public components, metadata, the sitemap and any future route handler take
 * this type, which turns "did we remember to hide the notes?" from a review
 * question into a compile error: the field does not exist to be rendered.
 *
 * The runtime half of the guarantee is `toPublicProject()` in
 * lib/content/public-project.ts — a type alone would not stop the field being
 * serialized into the RSC payload of a page that was handed a full `Project`.
 */
export type PublicProject = Omit<Project, "verificationNotes">;
