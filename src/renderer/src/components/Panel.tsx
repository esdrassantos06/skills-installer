import type { ReactNode } from "react";

export function Panel({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-panel">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            {title}
          </span>
          {subtitle && (
            <span className="text-[11px] text-subtle">{subtitle}</span>
          )}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}
