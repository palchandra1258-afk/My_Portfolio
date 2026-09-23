import type { Metric } from "@/lib/types";

const KIND_LABEL: Record<Metric["kind"], string> = {
  "verified-result": "Verified",
  target: "Target — not yet achieved",
  scope: "Scope",
  "dataset-fact": "Dataset fact",
  measured: "Measured — not independently verified",
  derived: "Derived",
  assumption: "Assumption",
  "needs-verification": "Needs verification",
};

export function MetricStat({ metric }: { metric: Metric }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="font-display text-3xl text-accent">{metric.value}</p>
      <p className="mt-1 text-sm text-foreground">{metric.label}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-muted">
        {KIND_LABEL[metric.kind]}
        {metric.note ? ` · ${metric.note}` : ""}
      </p>
    </div>
  );
}
