import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell, PageHeader, KpiCard } from "@/components/PageShell";
import { fmtMoney } from "@/lib/format";
import { Activity, CreditCard, Wallet, Sparkles, Plus } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { seedDemoData } from "@/lib/seedDemo";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";

type Overview = {
  monthly_income: number | null;
  budget: number | null;
  active_subs: number | null;
  monthly_burn: number | null;
  spent_this_month: number | null;
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--tertiary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--secondary-foreground))",
];

export default function Dashboard() {
  const { user } = useAuth();
  const { resolved } = useTheme();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [score, setScore] = useState<number>(0);
  const [predicted, setPredicted] = useState<number>(0);
  const [spending, setSpending] = useState<{ month: string; total: number }[]>([]);
  const [breakdown, setBreakdown] = useState<
    { category: string; monthly_cost: number; color: string | null }[]
  >([]);
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
      setSpending(
        ((ms as any[]) ?? [])
          .slice(0, 12)
          .reverse()
          .map((r) => ({
            month: new Date(r.month).toLocaleDateString("en", { month: "short" }),
            total: Number(r.total),
          })),
      );
      setBreakdown((cb as any[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const burn = Number(overview?.monthly_burn ?? 0);
  const budget = Number(overview?.budget ?? 0);
  const used = budget > 0 ? (burn / budget) * 100 : 0;

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
        title="Overview"
        subtitle="Your subscription intelligence at a glance."
        actions={
          <>
            {(overview?.active_subs ?? 0) === 0 && (
              <Button
                variant="outlined"
                onClick={async () => {
                  if (!user) return;
                  try {
                    const n = await seedDemoData(user.id);
                    toast.success(`Seeded ${n} demo subscriptions`);
                    location.reload();
                  } catch (e: any) {
                    toast.error(e.message);
                  }
                }}
              >
                Load demo data
              </Button>
            )}
            <Button asChild>
              <Link to="/app/subscriptions">
                <Plus className="w-[18px] h-[18px]" />
                Add subscription
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Active subs"
          value={overview?.active_subs ?? 0}
          icon={<CreditCard className="w-4 h-4" />}
        />
        <KpiCard
          label="Monthly burn"
          value={fmtMoney(burn)}
          hint={budget > 0 ? `${used.toFixed(0)}% of budget` : "no budget set"}
          icon={<Activity className="w-4 h-4" />}
          accent
        />
        <KpiCard
          label="Spent this month"
          value={fmtMoney(overview?.spent_this_month)}
          icon={<Wallet className="w-4 h-4" />}
        />
        <KpiCard
          label="Health score"
          value={
            <span
              className={
                score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-destructive"
              }
            >
              {score}
            </span>
          }
          hint="0–100, higher is healthier"
          icon={<Sparkles className="w-4 h-4" />}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-surface-low rounded-3xl p-6 shadow-e1 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display title-large">Spending trend</h2>
              <p className="body-small text-muted-foreground mt-0.5">
                Past 12 months · paid payments only
              </p>
            </div>
            <div className="text-right">
              <div className="label-small text-muted-foreground">Predicted next</div>
              <div className="font-mono title-medium text-primary">{fmtMoney(predicted)}</div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={spending} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#dashG)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-low rounded-3xl p-6 shadow-e1">
          <h2 className="font-display title-large mb-1">Category mix</h2>
          <p className="body-small text-muted-foreground mb-4">Normalized monthly</p>
          {breakdown.length === 0 ? (
            <div className="body-medium text-muted-foreground py-12 text-center">
              No subscriptions yet.
            </div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="monthly_cost"
                    nameKey="category"
                    innerRadius={48}
                    outerRadius={78}
                    stroke="hsl(var(--surface-low))"
                    strokeWidth={3}
                  >
                    {breakdown.map((b, i) => (
                      <Cell key={i} fill={b.color || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-3 space-y-1.5">
            {breakdown.slice(0, 5).map((b, i) => (
              <div key={i} className="flex items-center justify-between body-small">
                <span className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: b.color || PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  {b.category || "Uncategorized"}
                </span>
                <span className="font-mono">{fmtMoney(b.monthly_cost)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="body-small text-muted-foreground mt-6">Crunching numbers…</div>
      )}
    </PageShell>
  );
}
