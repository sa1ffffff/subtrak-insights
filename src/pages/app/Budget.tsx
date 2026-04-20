import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell, PageHeader } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export default function Budget() {
  const { user } = useAuth();
  const [income, setIncome] = useState("");
  const [budget, setBudget] = useState("");
  const [spent, setSpent] = useState(0);
  const [burn, setBurn] = useState(0);
  const [budgetId, setBudgetId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const [{ data: p }, { data: b }, { data: ov }] = await Promise.all([
      supabase.from("profiles").select("monthly_income").eq("user_id", user.id).maybeSingle(),
      supabase.from("budgets").select("id,monthly_limit").eq("user_id", user.id).eq("is_active", true).maybeSingle(),
      supabase.from("dashboard_overview").select("spent_this_month,monthly_burn").eq("user_id", user.id).maybeSingle(),
    ]);
    setIncome(String(p?.monthly_income ?? ""));
    setBudget(String(b?.monthly_limit ?? ""));
    setBudgetId((b as any)?.id ?? null);
    setSpent(Number((ov as any)?.spent_this_month ?? 0));
    setBurn(Number((ov as any)?.monthly_burn ?? 0));
  };
  useEffect(() => { load(); }, [user]);

  const save = async () => {
    if (!user) return;
    const inc = Number(income || 0);
    const lim = Number(budget || 0);
    const { error: e1 } = await supabase.from("profiles").update({ monthly_income: inc }).eq("user_id", user.id);
    if (e1) return toast.error(e1.message);
    if (budgetId) {
      const { error } = await supabase.from("budgets").update({ monthly_limit: lim }).eq("id", budgetId);
      if (error) return toast.error(error.message);
    } else if (lim > 0) {
      const { error } = await supabase.from("budgets").insert({ user_id: user.id, monthly_limit: lim, is_active: true });
      if (error) return toast.error(error.message);
    }
    toast.success("Saved");
    load();
  };

  const lim = Number(budget || 0);
  const usedPct = lim > 0 ? Math.min(100, (burn / lim) * 100) : 0;
  const spentPct = lim > 0 ? Math.min(100, (spent / lim) * 100) : 0;

  return (
    <PageShell className="max-w-3xl">
      <PageHeader title="Budget control" subtitle="Set your income and monthly cap. We'll alert you on overspending." />

      <div className="glass-card p-6 mb-4">
        <h2 className="font-display font-semibold mb-4">Limits</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Monthly income</Label>
            <Input type="number" step="0.01" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="5000" />
          </div>
          <div>
            <Label>Monthly subscription budget</Label>
            <Input type="number" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="200" />
          </div>
        </div>
        <Button onClick={save} className="mt-4 bg-gradient-primary text-primary-foreground">Save</Button>
      </div>

      <div className="glass-card p-6">
        <h2 className="font-display font-semibold mb-4">This month</h2>
        {lim === 0 ? (
          <div className="text-sm text-muted-foreground">Set a budget above to start tracking.</div>
        ) : (
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Committed monthly burn</span>
                <span className="font-mono">{fmtMoney(burn)} / {fmtMoney(lim)}</span>
              </div>
              <Progress value={usedPct} className={usedPct > 100 ? "[&>div]:bg-destructive" : usedPct > 80 ? "[&>div]:bg-warning" : "[&>div]:bg-gradient-primary"} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Actually paid this month</span>
                <span className="font-mono">{fmtMoney(spent)} / {fmtMoney(lim)}</span>
              </div>
              <Progress value={spentPct} className={spentPct > 100 ? "[&>div]:bg-destructive" : "[&>div]:bg-gradient-primary"} />
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
