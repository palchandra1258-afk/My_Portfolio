// Phase 7B-1 — Validate.
//
// Gate between Normalize and Import (docs/DATABASE_DESIGN.md §25). Every check
// here exists to catch a problem *before* it reaches PostgreSQL, either because
// the database would reject the write (a constraint precondition) or because
// the database would silently accept content that is wrong (a fidelity check).
//
// Pure: takes the output of normalize() and returns findings. No database
// access, no I/O — so it is unit-testable and runnable without a database.
//
// Nothing here modifies content. A validator that "fixes" its input would
// defeat the purpose: TypeScript content is authoritative (CLAUDE.md §6), so a
// mismatch is a fact to report, never something to clean up.

import { projects as sourceProjects } from "@/content/projects";
import {
  CATEGORY_MAP,
  EVIDENCE_MAP,
  IMPLEMENTATION_STATUS_MAP,
  METRIC_KIND_MAP,
  STATUS_MAP,
  type NormalizedData,
  type NormalizedProject,
} from "./normalize";

export type Severity = "error" | "warning";

export interface ValidationIssue {
  severity: Severity;
  /** Stable machine-readable code, so tests assert on codes rather than prose. */
  code: string;
  /** Where the problem is, in source terms (a slug, a table, a field path). */
  where: string;
  message: string;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  ok: boolean;
}

/**
 * Projects documented as deliberately absent from the portfolio. Listed here so
 * an accidental re-introduction fails validation loudly instead of quietly
 * appearing in the database.
 *
 * Source: docs/PROJECT_INVENTORY.md — "No corresponding entry exists in
 * content/projects.ts, and it has been deliberately not added ... Do not
 * migrate it to the database."
 */
const DELIBERATELY_ABSENT_TITLE_FRAGMENTS = ["portfolio optimization"];

const VALID_CATEGORIES = new Set<string>(Object.values(CATEGORY_MAP));
const VALID_STATUSES = new Set<string>(Object.values(STATUS_MAP));
const VALID_EVIDENCE = new Set<string>(Object.values(EVIDENCE_MAP));
const VALID_METRIC_KINDS = new Set<string>(Object.values(METRIC_KIND_MAP));
const VALID_IMPLEMENTATION_STATUSES = new Set<string>(Object.values(IMPLEMENTATION_STATUS_MAP));
const VALID_SOURCES = new Set<string>(["Resume", "GitHub", "Both"]);
const VALID_LIST_TYPES = new Set<string>(["results", "what_is_working", "what_is_in_development"]);
const VALID_SKILL_SOURCES = new Set<string>(["resume", "github"]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

/**
 * Every ordered child list must carry displayOrder 0..n-1 with no gaps or
 * duplicates. Ordering is *derived* data (CMS_SPECIFICATION.md §23 forbids
 * relying on insertion order), so a broken sequence would silently reorder
 * rendered content without anyone editing content.
 */
function checkOrderSequence(issues: ValidationIssue[], where: string, orders: number[]): void {
  const expected = orders.map((_, i) => i).join(",");
  const actual = [...orders].sort((a, b) => a - b).join(",");
  if (expected !== actual) {
    issues.push({
      severity: "error",
      code: "display_order_not_contiguous",
      where,
      message: `displayOrder must be 0..${orders.length - 1} with no gaps or duplicates; got [${orders.join(", ")}].`,
    });
  }
}

function validateProject(
  issues: ValidationIssue[],
  project: NormalizedProject,
  slugIndex: Map<string, NormalizedProject>,
): void {
  const at = `projects/${project.slug}`;

  if (!SLUG_PATTERN.test(project.slug)) {
    issues.push({
      severity: "error",
      code: "slug_format",
      where: at,
      message: `Slug "${project.slug}" is not lowercase-kebab-case; DATABASE_DESIGN.md §22 makes the slug the public URL identifier.`,
    });
  }

  // NOT NULL text columns in prisma/schema.prisma. A blank value would import
  // successfully and render as an empty heading, which is worse than failing.
  const requiredText: [string, string][] = [
    ["title", project.title],
    ["shortDescription", project.shortDescription],
    ["verificationNotes", project.verificationNotes],
  ];
  for (const [field, value] of requiredText) {
    if (isBlank(value)) {
      issues.push({
        severity: "error",
        code: "required_field_blank",
        where: `${at}.${field}`,
        message: `${field} is required and must not be blank.`,
      });
    }
  }

  // Controlled vocabularies (DATABASE_DESIGN.md §7). TypeScript already
  // constrains these at compile time; this re-checks at runtime because the
  // enum values are what PostgreSQL will actually accept or reject.
  const vocabularyChecks: [string, string, Set<string>][] = [
    ["category", project.category, VALID_CATEGORIES],
    ["status", project.status, VALID_STATUSES],
    ["evidenceStatus", project.evidenceStatus, VALID_EVIDENCE],
    ["source", project.source, VALID_SOURCES],
  ];
  for (const [field, value, allowed] of vocabularyChecks) {
    if (!allowed.has(value)) {
      issues.push({
        severity: "error",
        code: "unknown_enum_value",
        where: `${at}.${field}`,
        message: `"${value}" is not a member of the ${field} enum.`,
      });
    }
  }

  checkOrderSequence(
    issues,
    `${at}.alternateNames`,
    project.alternateNames.map((a) => a.displayOrder),
  );
  checkOrderSequence(issues, `${at}.technologies`, project.technologies.map((t) => t.displayOrder));
  checkOrderSequence(issues, `${at}.metrics`, project.metrics.map((m) => m.displayOrder));
  checkOrderSequence(
    issues,
    `${at}.implementationNotes`,
    project.implementationNotes.map((n) => n.displayOrder),
  );
  checkOrderSequence(
    issues,
    `${at}.relationships`,
    project.relationships.map((r) => r.displayOrder),
  );
  for (const listType of VALID_LIST_TYPES) {
    checkOrderSequence(
      issues,
      `${at}.contentListItems[${listType}]`,
      project.contentListItems.filter((i) => i.listType === listType).map((i) => i.displayOrder),
    );
  }

  // project_technologies has PK (project_id, technology_id): the same
  // technology twice in one project would violate it.
  const techSeen = new Set<string>();
  for (const tech of project.technologies) {
    if (isBlank(tech.name)) {
      issues.push({
        severity: "error",
        code: "blank_technology_name",
        where: `${at}.technologies`,
        message: "Technology names must not be blank.",
      });
    }
    if (techSeen.has(tech.name)) {
      issues.push({
        severity: "error",
        code: "duplicate_technology_in_project",
        where: `${at}.technologies`,
        message: `"${tech.name}" is listed more than once; project_technologies has PK (project_id, technology_id).`,
      });
    }
    techSeen.add(tech.name);
  }

  for (const metric of project.metrics) {
    if (isBlank(metric.label) || isBlank(metric.value)) {
      issues.push({
        severity: "error",
        code: "metric_field_blank",
        where: `${at}.metrics`,
        message: `Metric "${metric.label}" has a blank label or value.`,
      });
    }
    if (!VALID_METRIC_KINDS.has(metric.kind)) {
      issues.push({
        severity: "error",
        code: "unknown_enum_value",
        where: `${at}.metrics.kind`,
        message: `"${metric.kind}" is not a member of the metric_status enum.`,
      });
    }
  }

  for (const note of project.implementationNotes) {
    if (!VALID_IMPLEMENTATION_STATUSES.has(note.status)) {
      issues.push({
        severity: "error",
        code: "unknown_enum_value",
        where: `${at}.implementationNotes.status`,
        message: `"${note.status}" is not a member of the implementation_status enum.`,
      });
    }
  }

  for (const item of project.contentListItems) {
    if (!VALID_LIST_TYPES.has(item.listType)) {
      issues.push({
        severity: "error",
        code: "unknown_enum_value",
        where: `${at}.contentListItems.listType`,
        message: `"${item.listType}" is not a member of the content_list_type enum.`,
      });
    }
    if (isBlank(item.body)) {
      issues.push({
        severity: "error",
        code: "content_list_item_blank",
        where: `${at}.contentListItems[${item.listType}]`,
        message: "Content list items must not be blank.",
      });
    }
  }

  // Relationship checks. These are the preconditions for Constraint A
  // (source_project_id <> related_project_id) and the UNIQUE(source, related)
  // index — either violation would abort the import transaction.
  const pairSeen = new Set<string>();
  for (const rel of project.relationships) {
    if (!slugIndex.has(rel.relatedSlug)) {
      issues.push({
        severity: "error",
        code: "unresolved_relationship_slug",
        where: `${at}.relatedTo`,
        message: `relatedTo slug "${rel.relatedSlug}" matches no project in content/projects.ts. (In the TypeScript model this fails silently; the database rejects it.)`,
      });
      continue;
    }
    if (rel.relatedSlug === project.slug) {
      issues.push({
        severity: "error",
        code: "self_relationship",
        where: `${at}.relatedTo`,
        message: `Project relates to itself; violates CHECK "project_relationships_no_self_reference" (Constraint A).`,
      });
    }
    if (pairSeen.has(rel.relatedSlug)) {
      issues.push({
        severity: "error",
        code: "duplicate_relationship_pair",
        where: `${at}.relatedTo`,
        message: `Duplicate relationship to "${rel.relatedSlug}"; violates UNIQUE(source_project_id, related_project_id).`,
      });
    }
    pairSeen.add(rel.relatedSlug);
    if (isBlank(rel.note)) {
      issues.push({
        severity: "error",
        code: "required_field_blank",
        where: `${at}.relatedTo.note`,
        message: `Relationship note to "${rel.relatedSlug}" is blank; project_relationships.note is NOT NULL.`,
      });
    }
  }
}

export function validate(data: NormalizedData): ValidationResult {
  const issues: ValidationIssue[] = [];

  // --- Scope guard (architectural boundary) ---------------------------------
  // The migration covers exactly the projects in content/projects.ts, no more.
  if (data.projects.length !== sourceProjects.length) {
    issues.push({
      severity: "error",
      code: "project_count_mismatch",
      where: "projects",
      message: `Normalized ${data.projects.length} projects but content/projects.ts declares ${sourceProjects.length}. The database must be an exact replica of the source array.`,
    });
  }
  for (const project of data.projects) {
    const haystack = `${project.title} ${project.slug}`.toLowerCase();
    for (const fragment of DELIBERATELY_ABSENT_TITLE_FRAGMENTS) {
      if (haystack.includes(fragment)) {
        issues.push({
          severity: "error",
          code: "deliberately_absent_project",
          where: `projects/${project.slug}`,
          message: `Matches a project documented as deliberately absent ("${fragment}"); see docs/PROJECT_INVENTORY.md — "Do not migrate it to the database."`,
        });
      }
    }
  }

  // --- Project slug uniqueness (projects.slug is UNIQUE) --------------------
  const slugIndex = new Map<string, NormalizedProject>();
  for (const project of data.projects) {
    if (slugIndex.has(project.slug)) {
      issues.push({
        severity: "error",
        code: "duplicate_project_slug",
        where: `projects/${project.slug}`,
        message: `Slug "${project.slug}" appears more than once; projects.slug is UNIQUE.`,
      });
    }
    slugIndex.set(project.slug, project);
  }

  checkOrderSequence(issues, "projects", data.projects.map((p) => p.displayOrder));

  for (const project of data.projects) {
    validateProject(issues, project, slugIndex);
  }

  // --- Technology registry --------------------------------------------------
  // technologies.name is UNIQUE but case-sensitively so (schema.prisma records
  // this as a known limitation; DATABASE_DESIGN.md §26 Open Decision 9 defers
  // the citext-style fix). Case variants would therefore import as two separate
  // rows — reported as a warning, not an error, because it is a content
  // question, and silently merging them here would modify content.
  for (const [lowercase, variants] of data.technologyCaseIndex) {
    if (variants.length > 1) {
      issues.push({
        severity: "warning",
        code: "technology_case_collision",
        where: "technologies",
        message: `"${lowercase}" appears with differing casing: ${variants.map((v) => `"${v}"`).join(", ")}. These import as separate rows (case-insensitive uniqueness is Open Decision 9). Resolve in content/projects.ts, not here.`,
      });
    }
  }

  const registryNames = new Set(data.technologies.map((t) => t.name));
  if (registryNames.size !== data.technologies.length) {
    issues.push({
      severity: "error",
      code: "duplicate_technology_in_registry",
      where: "technologies",
      message: "The deduplicated technology registry still contains a duplicate name.",
    });
  }
  for (const project of data.projects) {
    for (const tech of project.technologies) {
      if (!registryNames.has(tech.name)) {
        issues.push({
          severity: "error",
          code: "technology_missing_from_registry",
          where: `projects/${project.slug}.technologies`,
          message: `"${tech.name}" is referenced by a project but absent from the technology registry.`,
        });
      }
    }
  }

  // --- Profile (singleton) --------------------------------------------------
  const profile = data.profile;
  // Constraint B is CHECK (id = 1); anything else aborts the import.
  if (profile.id !== 1) {
    issues.push({
      severity: "error",
      code: "profile_id_not_one",
      where: "profile",
      message: `profile.id must be 1; violates CHECK "profile_singleton" (Constraint B).`,
    });
  }
  const requiredProfileText: [string, string][] = [
    ["name", profile.name],
    ["location", profile.location],
    ["phone", profile.phone],
    ["email", profile.email],
    ["githubUrl", profile.githubUrl],
    ["linkedinUrl", profile.linkedinUrl],
    ["summary", profile.summary],
  ];
  for (const [field, value] of requiredProfileText) {
    if (isBlank(value)) {
      issues.push({
        severity: "error",
        code: "required_field_blank",
        where: `profile.${field}`,
        message: `profile.${field} is required and must not be blank.`,
      });
    }
  }

  checkOrderSequence(issues, "profile.education", profile.education.map((e) => e.displayOrder));
  checkOrderSequence(issues, "profile.experience", profile.experience.map((x) => x.displayOrder));
  checkOrderSequence(issues, "profile.achievements", profile.achievements.map((a) => a.displayOrder));
  checkOrderSequence(issues, "profile.financeAreas", profile.financeAreas.map((f) => f.displayOrder));
  checkOrderSequence(
    issues,
    "profile.technologyFinanceAreas",
    profile.technologyFinanceAreas.map((t) => t.displayOrder),
  );
  for (const [i, exp] of profile.experience.entries()) {
    checkOrderSequence(
      issues,
      `profile.experience[${i}].highlights`,
      exp.highlights.map((h) => h.displayOrder),
    );
  }

  // Skills are one table discriminated by `source` (schema.prisma, Skill).
  // The two sources have independent displayOrder sequences and different
  // category semantics, so they are checked separately.
  const resumeSkills = profile.skills.filter((s) => s.source === "resume");
  const githubSkills = profile.skills.filter((s) => s.source === "github");
  checkOrderSequence(issues, "profile.skills[resume]", resumeSkills.map((s) => s.displayOrder));
  checkOrderSequence(issues, "profile.skills[github]", githubSkills.map((s) => s.displayOrder));

  for (const skill of profile.skills) {
    if (!VALID_SKILL_SOURCES.has(skill.source)) {
      issues.push({
        severity: "error",
        code: "unknown_enum_value",
        where: "profile.skills.source",
        message: `"${skill.source}" is not a member of the skill_source enum.`,
      });
    }
    if (isBlank(skill.name)) {
      issues.push({
        severity: "error",
        code: "required_field_blank",
        where: "profile.skills.name",
        message: "Skill names must not be blank.",
      });
    }
    // The provenance distinction is load-bearing: resume skills carry the
    // resume's own category headings; GitHub-verified skills deliberately have
    // none, so the site never implies they came from the resume
    // (content/resume-data.ts).
    if (skill.source === "resume" && (skill.category === null || isBlank(skill.category))) {
      issues.push({
        severity: "error",
        code: "resume_skill_missing_category",
        where: "profile.skills",
        message: `Resume skill "${skill.name}" has no category.`,
      });
    }
    if (skill.source === "github" && skill.category !== null) {
      issues.push({
        severity: "error",
        code: "github_skill_has_category",
        where: "profile.skills",
        message: `GitHub-verified skill "${skill.name}" must have a null category.`,
      });
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  return { issues, errors, warnings, ok: errors.length === 0 };
}

export function formatValidationResult(result: ValidationResult): string {
  if (result.issues.length === 0) return "  No issues.";
  return result.issues
    .map((i) => `  [${i.severity.toUpperCase()}] ${i.code} @ ${i.where}\n      ${i.message}`)
    .join("\n");
}
