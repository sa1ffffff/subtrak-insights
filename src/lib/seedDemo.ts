import { supabase } from "@/integrations/supabase/client";

const SERVICES = [
  { name: "Netflix", price: 15.99, cycle: "monthly", days_ago: 95, idle_days: 0, payments: 3 },
  { name: "Spotify", price: 9.99, cycle: "monthly", days_ago: 200, idle_days: 0, payments: 6 },
  { name: "Notion", price: 8, cycle: "monthly", days_ago: 60, idle_days: 0, payments: 2 },
  { name: "Figma", price: 144, cycle: "yearly", days_ago: 365, idle_days: 0, payments: 1 },
  { name: "ChatGPT Plus", price: 20, cycle: "monthly", days_ago: 120, idle_days: 0, payments: 4 },
  { name: "GitHub Pro", price: 4, cycle: "monthly", days_ago: 400, idle_days: 0, payments: 12 },
  { name: "iCloud+", price: 2.99, cycle: "monthly", days_ago: 300, idle_days: 0, payments: 9 },
  { name: "Disney+", price: 11.99, cycle: "monthly", days_ago: 180, idle_days: 80, payments: 5 },
  { name: "Peloton", price: 24, cycle: "monthly", days_ago: 220, idle_days: 120, payments: 7 },
  { name: "Midjourney", price: 30, cycle: "monthly", days_ago: 100, idle_days: 70, payments: 3 },
] as const;

export async function seedDemoData(userId: string) {
  // 1. Set income/budget if missing
  await supabase.from("profiles").update({ monthly_income: 6500 }).eq("user_id", userId);
  const { data: existingBudget } = await supabase.from("budgets").select("id").eq("user_id", userId).eq("is_active", true).maybeSingle();
  if (!existingBudget) {
    await supabase.from("budgets").insert({ user_id: userId, monthly_limit: 150, is_active: true });
  }

  // 2. Lookup services
  const names = SERVICES.map((s) => s.name);
  const { data: svcRows } = await supabase.from("services").select("id,name,category_id").in("name", names);
  const svcByName = new Map((svcRows ?? []).map((s: any) => [s.name, s]));

  // 3. Insert subscriptions
  const today = new Date();
  const now = today.toISOString().slice(0, 10);
  const subsToInsert = SERVICES.map((s) => {
    const svc = svcByName.get(s.name);
    const start = new Date(today); start.setDate(today.getDate() - s.days_ago);
    return {
      user_id: userId,
      service_id: svc?.id ?? null,
      category_id: svc?.category_id ?? null,
      name: s.name,
      price: s.price,
      billing_cycle: s.cycle as any,
      start_date: start.toISOString().slice(0, 10),
      status: "active" as const,
    };
  });
  const { data: insertedSubs, error } = await supabase.from("subscriptions").insert(subsToInsert).select("id,name");
  if (error) throw error;

  // 4. Insert payments + usage logs
  const payments: any[] = [];
  const usage: any[] = [];
  for (const sub of insertedSubs ?? []) {
    const meta = SERVICES.find((s) => s.name === sub.name)!;
    for (let i = 0; i < meta.payments; i++) {
      const d = new Date(today);
      d.setMonth(today.getMonth() - i);
      payments.push({
        user_id: userId,
        subscription_id: sub.id,
        amount: meta.price,
        payment_date: d.toISOString().slice(0, 10),
        status: "paid",
      });
    }
    // usage: log if idle_days small, else only 1 ancient usage
    if (meta.idle_days < 30) {
      for (let i = 0; i < 8; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i * 3);
        usage.push({ user_id: userId, subscription_id: sub.id, used_at: d.toISOString().slice(0, 10), minutes_used: 30 });
      }
    } else {
      const d = new Date(today);
      d.setDate(today.getDate() - meta.idle_days);
      usage.push({ user_id: userId, subscription_id: sub.id, used_at: d.toISOString().slice(0, 10), minutes_used: 5 });
    }
  }
  if (payments.length) await supabase.from("payments").insert(payments);
  if (usage.length) await supabase.from("usage_logs").insert(usage);

  return insertedSubs?.length ?? 0;
}
