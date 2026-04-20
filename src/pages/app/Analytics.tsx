import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell, PageHeader } from "@/components/PageShell";
import { fmtMoney } from "@/lib/format";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useTheme } from "@/hooks/useTheme";

export default function Analytics() {
  const { user } = useAuth();
  const { resolved } = useTheme();
  const [monthly, setMonthly] = useState<{ month: string; total: number }[]>([]);
  const [top, setTop] = useState<{ name: string; price: number; mc: number }[]>([]);
  const [waste, setWaste] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: ms }, { data: subs }, { data: w }] = await Promise.all([
        supabase.rpc("monthly_spending", { _user: user.id }),
        supabase
          .from("active_subscriptions")
          .select("name,price,normalized_monthly_cost")
          .eq("user_id", user.id)
          .order("normalized_monthly_cost", { ascending: false })
          .limit(8),
        supabase.rpc("detect_waste", { _user: user.id }),
      ]);
      setMonthly(
        ((ms as any[]) ?? [])
          .slice(0, 12)
          .reverse()
          .map((r) => ({
            month: new Date(r.month).toLocaleDateString("en", { month: "short" }),
            total: Number(r.total),
          })),
      );
      setTop(
        ((subs as any[]) ?? []).map((s) => ({
          name: s.name,
          price: Number(s.price),
          mc: Number(s.normalized_monthly_cost),
        })),
      );
      setWaste((w as any[]) ?? []);
    })();
  }, [user]);

  const tooltipStyle = {
    background: resolved === "dark" ? "hsl(270 12% 14%)" : "hsl(0 0% 100%)",
    border: `1px solid hsl(var(--outline-variant))`,
    borderRadius: 12,
    fontSize: 12,
    padding: "8px 12px",
    boxShadow: "var(--elevation-2)",
    color: "hsl(var(--foreground))",
  } as const;

  return (
    <PageShell>
      <PageHeader
        title="Analytics"
        subtitle="SQL-powered insights using CTEs, window functions & aggregations."
      />

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-surface-low rounded-3xl p-6 shadow-e1">
          <h2 className="font-display title-large mb-4">Monthly spending</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={monthly}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--outline-variant))"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtMoney(v)} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-low rounded-3xl p-6 shadow-e1">
          <h2 className="font-display title-large mb-4">Top expensive subscriptions</h2>
          <div className="space-y-3">
            {top.length === 0 && (
              <div className="body-medium text-muted-foreground py-6 text-center">
                No data yet.
              </div>
            )}
            {top.map((t, i) => {
              const max = Math.max(...top.map((x) => x.mc), 1);
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between body-medium">
                    <span>{t.name}</span>
                    <span className="font-mono text-muted-foreground">{fmtMoney(t.mc)}/mo</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-container overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-500 ease-m3-standard"
                      style={{ width: `${(t.mc / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-surface-low rounded-3xl p-6 shadow-e1">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h2 className="font-display title-large">Waste detection</h2>
            <p className="body-small text-muted-foreground mt-0.5">
              Subscriptions with no usage in 30+ days
            </p>
          </div>
          <div className="text-right">
            <div className="label-small text-muted-foreground">Estimated monthly waste</div>
            <div className="font-mono title-medium text-destructive">
              {fmtMoney(waste.reduce((s, w) => s + Number(w.monthly_cost ?? 0), 0))}
            </div>
          </div>
        </div>
        {waste.length === 0 ? (
          <div className="body-medium text-muted-foreground py-10 text-center">
            No wasteful subscriptions detected. 🎉
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="label-medium uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left py-2.5">Service</th>
                  <th className="text-right py-2.5">Monthly cost</th>
                  <th className="text-right py-2.5">Days idle</th>
                </tr>
              </thead>
              <tbody>
                {waste.map((w, i) => (
                  <tr key={i} className="border-t border-outline-variant/60">
                    <td className="py-3 label-large">{w.name}</td>
                    <td className="py-3 text-right font-mono body-medium">
                      {fmtMoney(w.monthly_cost)}
                    </td>
                    <td className="py-3 text-right font-mono body-medium text-warning">
                      {w.days_idle}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
