// Comparing two revision snapshots — Phase 10.
//
// CMS_SPECIFICATION.md §48 and ADMIN_DASHBOARD_SPECIFICATION.md §58: show
// previous against current, with the changed fields identified, plus author
// and timestamp. "Do not expose internal revision details publicly" — nothing
// here is reachable from a public route; see app/public-exposure.test.ts.
//
// ── Why this reads snapshots through `restoreFormData` ────────────────────
// A comparison that disagreed with restore would be worse than no comparison:
// the operator reads the diff precisely to decide whether to restore, and a
// field shown as changed that restore then leaves alone (or vice versa) turns
// the screen into a trap. Both therefore project a snapshot through the same
// tolerant function, so the guarantee is structural rather than maintained by
// hand:
//
//   a field this module reports as changed is exactly a field
//   `restoreProjectRevisionWithin` would write.
//
// `publishedAt` and `contentOrigin` are deliberately *not* part of that group.
// Restore never writes them, so they are reported separately as recorded
// state, and the screen says so rather than implying a restore would move
// them. `publicationStatus` is in the same position: it is recorded per
// revision but restore keeps the project's current value.
//
// ── Tolerant, because a snapshot is old data ──────────────────────────────
// Snapshots were written by past versions of this application. Comparison
// must render a malformed or legacy one rather than throwing — an operator
// looking at damaged history needs to see it, not a 500. `restoreFormData`
// already reads every field defensively; this module adds no assumptions of
// its own.
//
// Pure: snapshots in, plain strings out. Every value is a string by the time
// it leaves here, so the presentation layer renders escaped text children and
// never needs `dangerouslySetInnerHTML`.

import { restoreFormData } from "@/lib/admin/restore";
import type { ProjectSnapshot } from "@/lib/repositories/revision-repository.server";

/** One row of the comparison table. */
export interface FieldComparison {
  /** Stable key — the form field name, so it matches what restore writes. */
  field: string;
  label: string;
  /** Always a string, always rendered as escaped text. */
  before: string;
  after: string;
  changed: boolean;
  /** Presentation hint: prose that needs its own block rather than a cell. */
  multiline: boolean;
}

export interface RevisionComparison {
  /** Fields a restore would write. */
  content: FieldComparison[];
  /** Fields recorded per revision that a restore does NOT write. */
  state: FieldComparison[];
  /** How many of `content` differ. */
  changedCount: number;
  /** True when nothing in `content` differs. */
  identical: boolean;
}

/**
 * The editor-owned fields, in the order the edit form presents them.
 *
 * `publicationStatus` is absent on purpose: `restoreFormData` fills it from
 * its second argument rather than from the snapshot, so it is reported under
 * `state` instead, where it is read straight off the snapshot.
 */
const CONTENT_FIELDS: readonly { field: string; label: string; multiline?: boolean }[] = [
  { field: "slug", label: "Slug" },
  { field: "title", label: "Title" },
  { field: "category", label: "Category" },
  { field: "status", label: "Status" },
  { field: "source", label: "Source" },
  { field: "featured", label: "Featured" },
  { field: "displayOrder", label: "Display order" },
  { field: "evidenceStatus", label: "Evidence status" },
  { field: "githubUrl", label: "GitHub URL" },
  { field: "demoUrl", label: "Demo URL" },
  { field: "technologies", label: "Technologies", multiline: true },
  { field: "shortDescription", label: "Short description", multiline: true },
  {
    field: "verificationNotes",
    label: "Internal verification notes",
    multiline: true,
  },
];

/** Placeholder for a field that holds nothing. Never an empty cell. */
const EMPTY = "—";

/**
 * Read one editor field out of a snapshot's normalized form projection.
 *
 * `featured` is a checkbox, so `restoreFormData` omits it entirely when false
 * — the same quirk that makes restore correct would make a diff read "changed:
 * false → (empty)". Translated to Yes/No here so the comparison reports what
 * the operator actually sees in the editor.
 */
function readField(form: FormData, field: string): string {
  if (field === "featured") return form.get("featured") === null ? "No" : "Yes";

  const raw = form.get(field);
  const value = typeof raw === "string" ? raw : "";
  if (value.length === 0) return EMPTY;

  // Stored one-per-line for the textarea; read as a list for display.
  if (field === "technologies") return value.split("\n").join(", ");

  return value;
}

/** A snapshot's recorded row state — the part a restore leaves alone. */
function readState(snapshot: ProjectSnapshot): { field: string; label: string; value: string }[] {
  const publishedAt =
    typeof snapshot?.publishedAt === "string" && snapshot.publishedAt.length > 0
      ? snapshot.publishedAt.slice(0, 10)
      : EMPTY;

  const origin = snapshot?.contentOrigin;

  return [
    {
      field: "publicationStatus",
      label: "Publication status",
      value: typeof snapshot?.publicationStatus === "string" ? snapshot.publicationStatus : EMPTY,
    },
    { field: "publishedAt", label: "Published at", value: publishedAt },
    {
      field: "contentOrigin",
      label: "Content origin",
      value: origin === "cms" ? "CMS" : origin === undefined ? EMPTY : "TypeScript import",
    },
  ];
}

/**
 * Compare two snapshots field by field.
 *
 * `before` and `after` are positional and this function does not reorder them
 * — the caller decides which revision is the earlier one, because only it
 * knows the version numbers. Comparing a snapshot with itself is legitimate
 * and yields `identical: true` rather than an error.
 *
 * Every field is returned, changed or not: ADMIN_DASHBOARD_SPECIFICATION.md
 * §58 asks for changed fields to be highlighted *within* the comparison, not
 * for the unchanged ones to be hidden. An operator deciding whether to restore
 * needs to see what stays the same as much as what moves.
 */
export function compareSnapshots(
  before: ProjectSnapshot,
  after: ProjectSnapshot,
): RevisionComparison {
  // Each snapshot is projected using its own recorded status, so `state`
  // below reports what that revision actually held.
  const beforeForm = restoreFormData(before, "draft");
  const afterForm = restoreFormData(after, "draft");

  const content = CONTENT_FIELDS.map(({ field, label, multiline }) => {
    const beforeValue = readField(beforeForm, field);
    const afterValue = readField(afterForm, field);
    return {
      field,
      label,
      before: beforeValue,
      after: afterValue,
      changed: beforeValue !== afterValue,
      multiline: multiline === true,
    };
  });

  const beforeState = readState(before);
  const afterState = readState(after);
  const state = beforeState.map((entry, index) => {
    const afterEntry = afterState[index];
    return {
      field: entry.field,
      label: entry.label,
      before: entry.value,
      after: afterEntry.value,
      changed: entry.value !== afterEntry.value,
      multiline: false,
    };
  });

  const changedCount = content.filter((entry) => entry.changed).length;

  return { content, state, changedCount, identical: changedCount === 0 };
}
