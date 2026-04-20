import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell, PageHeader, KpiCard } from "@/components/PageShell";
import { fmtMoney } from "@/lib/format";
import { Activity, CreditCard, TrendingUp, Wallet, AlertTriangle, Sparkles } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type Overview = {
  monthly_income: number | null;
  budget: number | null;
  active_subs: number | null;
  monthly_burn: number | null;
  spent_this_month: number | null;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [score, setScore] = useState<number>(0);
  const [predicted, setPredicted] = useState<number>(0);
  const [spending, setSpending] = useState<{ month: string; total: number }[]>([]);
  const [breakdown, setBreakdown] = useState<{ category: string; monthly_cost: number; color: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: ov }, { data: sc }, { data: pr }, { data: ms }, { data: cb }] = await Promise.all([
        supabase.from("dashboard_overview").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.rpc("compute_subscription_score", { _user: user.id }),
        supabase.rpc("predict_next_month_spending", { _user: user.id }),
        supabase.rpc("monthly_spending", { _user: user.id }),
        supabase.from("category_breakdown").select("*").eq("user_id", user.id),
      ]);
      setOverview(ov as any);
      setScore(Number(sc ?? 0));
      setPredicted(Number(pr ?? 0));
      setSpending(((ms as any[]) ?? []).slice(0, 12).reverse().map((r) => ({
        month: new Date(r.month).toLocaleDateString("en", { month: "short" }),
        total: Number(r.total),
      })));
      setBreakdown((cb as any[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const burn = Number(overview?.monthly_burn ?? 0);
  const budget = Number(overview?.budget ?? 0);
  const used = budget > 0 ? (burn / budget) * 100 : 0;

  return (
    <PageShell>
      <PageHeader
        title="Overview"
        subtitle="Your subscription intelligence at a glance."
        actions={<Button asChild className="bg-gradient-primary text-primary-foreground"><Link to="/app/subscriptions">+ Add subscription</Link></Button>}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Active subs" value={overview?.active_subs ?? 0} icon={<CreditCard className="w-4 h-4" />} />
        <KpiCard label="Monthly burn" value={fmtMoney(burn)} hint={budget > 0 ? `${used.toFixed(0)}% of budget` : "no budget set"} icon={<Activity className="w-4 h-4" />} accent />
        <KpiCard label="Spent this month" value={fmtMoney(overview?.spent_this_month)} icon={<Wallet className="w-4 h-4" />} />
        <KpiCard label="Health score" value={<span className={score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-destructive"}>{score}</span>} hint="0–100, higher is healthier" icon={<Sparkles className="w-4 h-4" />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-semibold">Spending trend</h2>
              <p className="text-xs text-muted-foreground">Past 12 months · paid payments only</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Predicted next</div>
              <div className="font-mono font-semibold text-primary">{fmtMoney(predicted)}</div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={spending} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(258 90% 66%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(258 90% 66%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="hsl(240 5% 55%)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(240 5% 55%)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(240 8% 8%)", border: "1px solid hsl(240 6% 14%)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => fmtMoney(v)}
                />
                <Area type="monotone" dataKey="total" stroke="hsl(258 90% 66%)" strokeWidth={2} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="font-display font-semibold mb-1">Category mix</h2>
          <p className="text-xs text-muted-foreground mb-4">Normalized monthly</p>
          {breakdown.length === 0 ? (
            <div className="text-sm text-muted-foreground py-12 text-center">No subscriptions yet.</div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={breakdown} dataKey="monthly_cost" nameKey="category" innerRadius={45} outerRadius={75} stroke="hsl(240 8% 7%)" strokeWidth={2}>
                    {breakdown.map((b, i) => <Cell key={i} fill={b.color || ["#a78bfa", "#22d3ee", "#34d399", "#f472b6", "#fbbf24"][i % 5]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(240 8% 8%)", border: "1px solid hsl(240 6% 14%)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => fmtMoney(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-3 space-y-1.5">
            {breakdown.slice(0, 5).map((b, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: b.color || "#a78bfa" }} />
                  {b.category || "Uncategorized"}
                </span>
                <span className="font-mono">{fmtMoney(b.monthly_cost)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading && <div className="text-sm text-muted-foreground mt-6">Crunching numbers…</div>}
    </PageShell>
  );
}
