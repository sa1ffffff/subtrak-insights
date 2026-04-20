import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell, PageHeader } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { fmtMoney } from "@/lib/format";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Renewal = {
  id: string;
  name: string;
  price: number;
  billing_cycle: string;
  next_billing_date: string;
  category_color: string | null;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfMonthGrid(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  // Monday-first
  const dow = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - dow);
  return start;
}

function buildRenewalsForMonth(subs: Renewal[], cursor: Date) {
  // For each sub, project its next_billing_date forward through the visible month
  // by walking the billing cycle. Returns a Map<dateString, Renewal[]>.
  const map = new Map<string, (Renewal & { occurrence: string })[]>();
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  // include some leading/trailing days of grid
  const gridStart = startOfMonthGrid(cursor);
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + 41);

  for (const s of subs) {
    if (!s.next_billing_date) continue;
    let d = new Date(s.next_billing_date + "T00:00:00");
    // walk back if the next_billing_date is past gridEnd? skip
    // walk forward through grid window
    let safety = 60;
    while (d <= gridEnd && safety-- > 0) {
      if (d >= gridStart) {
        const key = d.toISOString().slice(0, 10);
        const arr = map.get(key) ?? [];
        arr.push({ ...s, occurrence: key });
        map.set(key, arr);
      }
      // advance by cycle
      const nd = new Date(d);
      switch (s.billing_cycle) {
        case "weekly": nd.setDate(nd.getDate() + 7); break;
        case "monthly": nd.setMonth(nd.getMonth() + 1); break;
        case "quarterly": nd.setMonth(nd.getMonth() + 3); break;
        case "yearly": nd.setFullYear(nd.getFullYear() + 1); break;
        default: nd.setMonth(nd.getMonth() + 1);
      }
      d = nd;
    }
  }
  return { map, monthStart, monthEnd, gridStart };
}

export default function Calendar() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<Renewal[]>([]);
  const [cursor, setCursor] = useState(() => new Date());

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("active_subscriptions")
        .select("id,name,price,billing_cycle,next_billing_date,category_color")
        .eq("user_id", user.id);
      setSubs((data as any) ?? []);
    })();
  }, [user]);

  const { map, monthStart, gridStart } = useMemo(() => buildRenewalsForMonth(subs, cursor), [subs, cursor]);

  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const monthTotal = days.reduce((sum, d) => {
    if (d.getMonth() !== monthStart.getMonth()) return sum;
    const items = map.get(d.toISOString().slice(0, 10)) ?? [];
    return sum + items.reduce((s, x) => s + Number(x.price), 0);
  }, 0);

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <PageShell>
      <PageHeader
        title="Renewal calendar"
        subtitle="Every upcoming charge, projected from billing cycles."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="font-display font-semibold w-40 text-center">
              {cursor.toLocaleDateString("en", { month: "long", year: "numeric" })}
            </div>
            <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>Today</Button>
          </div>
        }
      />

      <div className="glass-card p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="w-4 h-4" />
          {subs.length} active subscription{subs.length === 1 ? "" : "s"} tracked
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Projected charges this month</div>
          <div className="font-mono font-semibold">{fmtMoney(monthTotal)}</div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2 py-2 text-[10px] uppercase tracking-wider text-muted-foreground text-center">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const key = d.toISOString().slice(0, 10);
            const items = map.get(key) ?? [];
            const inMonth = d.getMonth() === monthStart.getMonth();
            const isToday = key === todayKey;
            const dayTotal = items.reduce((s, x) => s + Number(x.price), 0);
            return (
              <div
                key={i}
                className={`min-h-[110px] border-b border-r border-border/60 p-2 flex flex-col gap-1 transition ${
                  inMonth ? "bg-card/40" : "bg-card/10 text-muted-foreground/40"
                } ${(i + 1) % 7 === 0 ? "border-r-0" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-mono ${isToday ? "bg-gradient-primary text-primary-foreground rounded-md px-1.5 py-0.5 font-semibold" : ""}`}>
                    {d.getDate()}
                  </span>
                  {dayTotal > 0 && inMonth && (
                    <span className="text-[10px] font-mono text-muted-foreground">{fmtMoney(dayTotal)}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1 overflow-hidden">
                  {items.slice(0, 3).map((it, idx) => (
                    <Popover key={idx}>
                      <PopoverTrigger asChild>
                        <button
                          className="w-full text-left text-[11px] truncate px-1.5 py-0.5 rounded border border-border/60 hover:border-primary/60 hover:bg-primary/10 transition flex items-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: it.category_color ?? "hsl(258 90% 66%)" }} />
                          <span className="truncate">{it.name}</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 text-sm">
                        <div className="font-medium">{it.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{it.billing_cycle}</div>
                        <div className="font-mono text-base mt-1">{fmtMoney(it.price)}</div>
                        <div className="text-xs text-muted-foreground mt-1">Renews {new Date(key).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}</div>
                      </PopoverContent>
                    </Popover>
                  ))}
                  {items.length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1">+{items.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
