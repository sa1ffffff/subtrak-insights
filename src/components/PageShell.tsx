import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-6 md:p-10 max-w-7xl mx-auto animate-fade-in", className)}>{children}</div>;
}

export function KpiCard({
  label, value, hint, accent = false, icon
}: { label: string; value: ReactNode; hint?: ReactNode; accent?: boolean; icon?: ReactNode }) {
  return (
    <div className={cn("glass-card p-5 relative overflow-hidden", accent && "shadow-glow")}>
      {accent && <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />}
      <div className="relative flex items-start justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="relative kpi-value">{value}</div>
      {hint && <div className="relative text-xs text-muted-foreground mt-2">{hint}</div>}
    </div>
  );
}
