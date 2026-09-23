// Schema vocabulary — the correspondence between the TypeScript string unions
// in lib/types.ts and the enum identifiers in prisma/schema.prisma.
//
// Moved here verbatim from scripts/db/normalize.ts so that library code
// (lib/repositories/read-model.ts) no longer reaches into scripts/. The
// dependency now runs the right way round: both the migration pipeline under
// scripts/db/ and the read model under lib/ import this one definition.
//
// Values are unchanged. Each `*_MAP` is a total Record keyed by the TypeScript
// union, so adding a member to a union in lib/types.ts is a compile error here
// until the Prisma side is taught about it too — which is the point.
//
// The database still stores the original string via Prisma's @map (e.g.
// "coming-soon" for `coming_soon`), so nothing about a content value changes
// when it crosses this boundary; only the identifier spelling does.
//
// No database or Prisma client import: these are plain string-literal unions,
// deliberately declared by hand, so this module stays free of any generated
// code and is safe to import from anywhere.

import type {
  ImplementationStatus,
  MetricStatus,
  ProjectCategory,
  ProjectStatus,
  VerificationStatus,
} from "@/lib/types";

// Prisma-side enum identifiers. Declared locally as string-literal unions so
// this module stays free of any database/client import.
export type PrismaProjectCategory = "featured" | "supporting" | "research" | "coming_soon";
export type PrismaProjectStatus =
  | "Completed"
  | "ActiveDevelopment"
  | "InternshipProject"
  | "ResearchExperimental"
  | "RepositoryPlaceholder"
  | "Unpublished";
export type PrismaVerificationStatus =
  | "verified"
  | "partially_verified"
  | "self_reported"
  | "unpublished"
  | "needs_information"
  | "in_development"
  | "planned";
export type PrismaMetricStatus =
  | "verified_result"
  | "target"
  | "scope"
  | "dataset_fact"
  | "measured"
  | "derived"
  | "assumption"
  | "needs_verification";
export type PrismaImplementationStatus =
  | "implemented"
  | "experimental"
  | "specified"
  | "in_development"
  | "planned"
  | "future";
export type PrismaProjectSource = "Resume" | "GitHub" | "Both";
export type PrismaContentListType = "results" | "what_is_working" | "what_is_in_development";
export type PrismaSkillSource = "resume" | "github";

export const CATEGORY_MAP: Record<ProjectCategory, PrismaProjectCategory> = {
  featured: "featured",
  supporting: "supporting",
  research: "research",
  "coming-soon": "coming_soon",
};

export const STATUS_MAP: Record<ProjectStatus, PrismaProjectStatus> = {
  Completed: "Completed",
  "Active Development": "ActiveDevelopment",
  "Internship Project": "InternshipProject",
  "Research / Experimental": "ResearchExperimental",
  "Repository Placeholder": "RepositoryPlaceholder",
  Unpublished: "Unpublished",
};

export const EVIDENCE_MAP: Record<VerificationStatus, PrismaVerificationStatus> = {
  verified: "verified",
  "partially-verified": "partially_verified",
  "self-reported": "self_reported",
  unpublished: "unpublished",
  "needs-information": "needs_information",
  "in-development": "in_development",
  planned: "planned",
};

export const METRIC_KIND_MAP: Record<MetricStatus, PrismaMetricStatus> = {
  "verified-result": "verified_result",
  target: "target",
  scope: "scope",
  "dataset-fact": "dataset_fact",
  measured: "measured",
  derived: "derived",
  assumption: "assumption",
  "needs-verification": "needs_verification",
};

export const IMPLEMENTATION_STATUS_MAP: Record<ImplementationStatus, PrismaImplementationStatus> = {
  implemented: "implemented",
  experimental: "experimental",
  specified: "specified",
  "in-development": "in_development",
  planned: "planned",
  future: "future",
};
