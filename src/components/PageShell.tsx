import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8 animate-fade-in">
      <div>
        <h1 className="font-display headline-large text-foreground">{title}</h1>
        {subtitle && <p className="body-medium text-muted-foreground mt-1.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("p-6 md:p-10 max-w-7xl mx-auto animate-fade-in", className)}>
      {children}
    </div>
  );
}

/**
 * Material 3 KPI surface — filled card, tonal accent option.
 */
export function KpiCard({
  label,
  value,
  hint,
  accent = false,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 transition-shadow duration-200 ease-m3-standard",
        accent
          ? "bg-primary-container text-primary-on-container shadow-e1 hover:shadow-e2"
          : "bg-surface-low shadow-e1 hover:shadow-e2",
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="label-medium uppercase tracking-wider opacity-70">{label}</span>
        {icon && (
          <div
            className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center",
              accent ? "bg-primary/15" : "bg-secondary-container text-secondary-on-container",
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="kpi-value">{value}</div>
      {hint && <div className="body-small text-muted-foreground mt-2">{hint}</div>}
    </div>
  );
}
