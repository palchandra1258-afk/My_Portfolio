// Revision comparison view — CMS_SPECIFICATION.md §48,
// ADMIN_DASHBOARD_SPECIFICATION.md §58.
//
// Purely presentational. Rendered only by an admin route that has already
// established the session; it performs no data access and makes no
// authorization decision of its own.
//
// ── Rendering ─────────────────────────────────────────────────────────────
// Every value arrives from lib/admin/revision-diff.ts as a plain string and is
// rendered as an escaped React text child. There is no `dangerouslySetInnerHTML`
// here or anywhere in the admin area, so stored content — including a snapshot
// hand-edited in the database — cannot become markup.
//
// ── Not colour alone ──────────────────────────────────────────────────────
// SECURITY_AND_QUALITY.md §11 (accessibility): a changed field is marked by a
// visible "Changed" label and a left border as well as by the accent colour,
// so the distinction survives greyscale, low vision and forced-colours mode.
//
// ── Layout ────────────────────────────────────────────────────────────────
// Before and after stack on small screens and sit side by side from `sm` up.
// Prose fields keep `whitespace-pre-line` so a multi-line note reads as it was
// written rather than collapsing into one run-on line.

import { Panel } from "@/components/admin/admin-ui";
import type { FieldComparison, RevisionComparison } from "@/lib/admin/revision-diff";

/** The metadata shown above each column — §48: author and timestamp. */
export interface ComparisonSide {
  id: number;
  versionNumber: number;
  changeSummary: string | null;
  createdBy: string | null;
  createdAt: Date;
}

function formatMoment(value: Date): string {
  return value.toISOString().slice(0, 16).replace("T", " ");
}

function SideHeading({ side, role }: { side: ComparisonSide; role: "Before" | "After" }) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-wide text-muted">
        {role} · v{side.versionNumber}
      </div>
      <div className="mt-1 text-sm">{side.changeSummary ?? "Changed"}</div>
      <div className="mt-0.5 text-xs text-muted">
        <time dateTime={side.createdAt.toISOString()}>{formatMoment(side.createdAt)}</time>
        {/* Only rendered when an actor was actually recorded — never a
            stand-in like "system" for an author who does not exist. */}
        {side.createdBy !== null && ` · ${side.createdBy}`}
      </div>
    </div>
  );
}

function Value({ text, multiline }: { text: string; multiline: boolean }) {
  return (
    <p
      className={`mt-1 break-words text-sm leading-relaxed ${
        multiline ? "whitespace-pre-line" : ""
      }`}
    >
      {text}
    </p>
  );
}

function FieldRow({
  entry,
  before,
  after,
}: {
  entry: FieldComparison;
  before: ComparisonSide;
  after: ComparisonSide;
}) {
  return (
    <li
      className={`border-l-2 py-3 pl-4 ${
        entry.changed ? "border-accent bg-accent/5" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-mono text-[11px] uppercase tracking-wide text-muted">{entry.label}</h3>
        <span
          className={`font-mono text-[11px] uppercase tracking-wide ${
            entry.changed ? "text-accent" : "text-muted"
          }`}
        >
          {entry.changed ? "Changed" : "Unchanged"}
        </span>
      </div>

      <div className="mt-1 grid gap-x-8 gap-y-2 sm:grid-cols-2">
        <div>
          <span className="sr-only">Value at version {before.versionNumber}</span>
          <Value text={entry.before} multiline={entry.multiline} />
        </div>
        <div>
          <span className="sr-only">Value at version {after.versionNumber}</span>
          <Value text={entry.after} multiline={entry.multiline} />
        </div>
      </div>
    </li>
  );
}

export function RevisionComparisonView({
  before,
  after,
  comparison,
}: {
  before: ComparisonSide;
  after: ComparisonSide;
  comparison: RevisionComparison;
}) {
  return (
    <div className="space-y-6">
      <Panel title="Comparing">
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <SideHeading side={before} role="Before" />
          <SideHeading side={after} role="After" />
        </div>
      </Panel>

      <p
        role="status"
        className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${
          comparison.identical
            ? "border-border bg-card text-muted"
            : "border-accent/40 bg-accent/5"
        }`}
      >
        {comparison.identical
          ? `No differences in the editable content between v${before.versionNumber} and v${after.versionNumber}. Any difference between them is in the recorded state below.`
          : `${comparison.changedCount} field${comparison.changedCount === 1 ? "" : "s"} changed between v${before.versionNumber} and v${after.versionNumber}.`}
      </p>

      <Panel
        title="Editable content"
        description="These are the fields a restore would write. Unchanged fields are shown too."
      >
        <ul className="space-y-1">
          {comparison.content.map((entry) => (
            <FieldRow key={entry.field} entry={entry} before={before} after={after} />
          ))}
        </ul>
      </Panel>

      <Panel
        title="Recorded state"
        description="What each revision recorded about publication. A restore does not change these — it keeps the project's current publication state."
      >
        <ul className="space-y-1">
          {comparison.state.map((entry) => (
            <FieldRow key={entry.field} entry={entry} before={before} after={after} />
          ))}
        </ul>
      </Panel>
    </div>
  );
}
