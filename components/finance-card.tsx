export function FinanceCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="font-display text-lg leading-snug">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
    </div>
  );
}
