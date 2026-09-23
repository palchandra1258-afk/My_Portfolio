import type { VerificationStatus } from "@/lib/types";
import { CheckCircle2, CircleDashed, FileText, Hammer, HelpCircle, Lock } from "lucide-react";

const CONFIG: Record<
  VerificationStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  verified: {
    label: "Verified",
    className: "text-emerald-700 dark:text-emerald-400 border-emerald-700/30 dark:border-emerald-400/30",
    icon: CheckCircle2,
  },
  "partially-verified": {
    label: "Partially verified",
    className: "text-accent border-accent/30",
    icon: CircleDashed,
  },
  "self-reported": {
    label: "Self-reported",
    className: "text-amber-700 dark:text-amber-400 border-amber-700/30 dark:border-amber-400/30",
    icon: FileText,
  },
  "in-development": {
    label: "In development",
    className: "text-accent border-accent/30",
    icon: Hammer,
  },
  planned: {
    label: "Planned",
    className: "text-muted border-border",
    icon: CircleDashed,
  },
  unpublished: {
    label: "Unpublished",
    className: "text-muted border-border",
    icon: Lock,
  },
  "needs-information": {
    label: "Needs information",
    className: "text-muted border-border",
    icon: HelpCircle,
  },
};

export function StatusBadge({ status }: { status: VerificationStatus }) {
  const { label, className, icon: Icon } = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide ${className}`}
    >
      <Icon size={12} strokeWidth={2.25} />
      {label}
    </span>
  );
}
