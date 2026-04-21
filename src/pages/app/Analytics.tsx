import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell, PageHeader } from "@/components/PageShell";
import { fmtMoney } from "@/lib/format";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export default function Analytics() {
  const { user } = useAuth();
  const [monthly, setMonthly] = useState<{ month: string; total: number }[]>([]);
  const [top, setTop] = useState<{ name: string; price: number; mc: number }[]>([]);
  const [waste, setWaste] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: ms }, { data: subs }, { data: w }] = await Promise.all([
        supabase.rpc("monthly_spending", { _user: user.id }),
        supabase.from("active_subscriptions").select("name,price,normalized_monthly_cost").eq("user_id", user.id).order("normalized_monthly_cost", { ascending: false }).limit(8),
        supabase.rpc("detect_waste", { _user: user.id }),
      ]);
      setMonthly(((ms as any[]) ?? []).slice(0, 12).reverse().map((r) => ({
        month: new Date(r.month).toLocaleDateString("en", { month: "short" }),
        total: Number(r.total),
      })));
      setTop(((subs as any[]) ?? []).map((s) => ({ name: s.name, price: Number(s.price), mc: Number(s.normalized_monthly_cost) })));
      setWaste((w as any[]) ?? []);
    })();
  }, [user]);

  return (
    <PageShell>
      <PageHeader title="Analytics" subtitle="See where your money goes, spot wasted subscriptions, and track your spending trends." />

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <div className="glass-card p-6">
          <h2 className="font-display font-semibold mb-4">Monthly spending</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 14%)" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(240 5% 55%)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(240 5% 55%)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "hsl(240 8% 8%)", border: "1px solid hsl(240 6% 14%)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => fmtMoney(v)} />
                <Bar dataKey="total" fill="hsl(258 90% 66%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="font-display font-semibold mb-4">Top expensive subscriptions</h2>
          <div className="space-y-2">
            {top.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">No data yet.</div>}
            {top.map((t, i) => {
              const max = Math.max(...top.map((x) => x.mc), 1);
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{t.name}</span>
                    <span className="font-mono text-muted-foreground">{fmtMoney(t.mc)}/mo</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-primary" style={{ width: `${(t.mc / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-semibold">Waste detection</h2>
            <p className="text-xs text-muted-foreground">Subscriptions with no usage in 30+ days</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Estimated monthly waste</div>
            <div className="font-mono font-semibold text-destructive">
              {fmtMoney(waste.reduce((s, w) => s + Number(w.monthly_cost ?? 0), 0))}
            </div>
          </div>
        </div>
        {waste.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">No wasteful subscriptions detected. 🎉</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr><th className="text-left py-2">Service</th><th className="text-right py-2">Monthly cost</th><th className="text-right py-2">Days idle</th></tr>
            </thead>
            <tbody>
              {waste.map((w, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="py-2.5">{w.name}</td>
                  <td className="py-2.5 text-right font-mono">{fmtMoney(w.monthly_cost)}</td>
                  <td className="py-2.5 text-right font-mono text-warning">{w.days_idle}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageShell>
  );
}
