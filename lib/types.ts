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
  verificationNotes: string;
  whatIsWorking?: string[];
  whatIsInDevelopment?: string[];
  /** Optional structured superset of whatIsWorking/whatIsInDevelopment. Not yet populated on any project. */
  implementationNotes?: ImplementationNote[];
  relatedTo?: { slug: string; note: string }[];
  source: "Resume" | "GitHub" | "Both";
}
