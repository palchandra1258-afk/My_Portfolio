"use client";

// Admin sidebar navigation — Phase 6.
//
// A client component for one reason only: `usePathname()`, to mark the current
// section (ADMIN_DASHBOARD_SPECIFICATION.md §6). It receives no data, holds no
// session, and makes no authorization decision — which section is highlighted
// is presentation, and every route it points at re-checks the session on the
// server regardless of what this renders.
//
// Responsive without JavaScript: a horizontally scrollable row on small
// screens, a vertical rail from `lg` up. No drawer, no toggle, no focus trap —
// nothing to get wrong for keyboard or screen-reader users (§97).

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ADMIN_NAV_ITEMS, isActiveNavItem } from "@/lib/admin/navigation";

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="lg:sticky lg:top-6">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = isActiveNavItem(item, pathname);

          if (item.status === "planned") {
            return (
              <li key={item.href} className="shrink-0">
                {/* Not an anchor: the route does not exist yet. A disabled-looking
                    link that 404s is a worse experience than an honest label. */}
                <span
                  className="flex items-center justify-between gap-3 whitespace-nowrap rounded px-3 py-2 text-sm text-muted/60"
                  title={`Planned — ${item.phase}`}
                >
                  {item.label}
                  <span className="font-mono text-[10px] uppercase tracking-wide text-muted/50">
                    {item.phase}
                  </span>
                </span>
              </li>
            );
          }

          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  active
                    ? "bg-card text-foreground"
                    : "text-muted hover:bg-card/60 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
