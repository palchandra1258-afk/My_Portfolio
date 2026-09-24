// Small shared admin primitives — Phase 6.
//
// Deliberately only the two shapes that already repeat across the dashboard
// and the project pages. ADMIN_DASHBOARD_SPECIFICATION.md §69 asks for
// genuinely reusable components; a DataTable, FormField or ConfirmDialog
// abstraction would be speculative until there is a second table or a first
// form, so they are not here (CLAUDE.md §15: no abstraction without value).

export function Panel({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-display text-base">{title}</h2>
          {description !== undefined && (
            <p className="mt-1 text-sm text-muted">{description}</p>
          )}
        </div>
        {actions}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  note?: string;
  /** `attention` is for a figure the operator should act on, not for emphasis. */
  tone?: "neutral" | "attention";
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="font-mono text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div
        className={`mt-1 font-display text-2xl ${tone === "attention" ? "text-accent" : ""}`}
      >
        {value}
      </div>
      {note !== undefined && <div className="mt-1 text-xs text-muted">{note}</div>}
    </div>
  );
}
