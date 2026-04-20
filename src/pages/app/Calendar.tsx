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
  const dow = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - dow);
  return start;
}

function buildRenewalsForMonth(subs: Renewal[], cursor: Date) {
  const map = new Map<string, (Renewal & { occurrence: string })[]>();
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const gridStart = startOfMonthGrid(cursor);
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + 41);

  for (const s of subs) {
    if (!s.next_billing_date) continue;
    let d = new Date(s.next_billing_date + "T00:00:00");
    let safety = 60;
    while (d <= gridEnd && safety-- > 0) {
      if (d >= gridStart) {
        const key = d.toISOString().slice(0, 10);
        const arr = map.get(key) ?? [];
        arr.push({ ...s, occurrence: key });
        map.set(key, arr);
      }
      const nd = new Date(d);
      switch (s.billing_cycle) {
        case "weekly":
          nd.setDate(nd.getDate() + 7);
          break;
        case "monthly":
          nd.setMonth(nd.getMonth() + 1);
          break;
        case "quarterly":
          nd.setMonth(nd.getMonth() + 3);
          break;
        case "yearly":
          nd.setFullYear(nd.getFullYear() + 1);
          break;
        default:
          nd.setMonth(nd.getMonth() + 1);
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

  const { map, monthStart, gridStart } = useMemo(
    () => buildRenewalsForMonth(subs, cursor),
    [subs, cursor],
  );

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
          <div className="flex items-center gap-1 bg-surface-low rounded-full p-1 shadow-e1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
              }
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="font-display title-medium px-3 min-w-[10rem] text-center">
              {cursor.toLocaleDateString("en", { month: "long", year: "numeric" })}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
              }
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-outline-variant mx-1" />
            <Button variant="text" size="sm" onClick={() => setCursor(new Date())}>
              Today
            </Button>
          </div>
        }
      />

      <div className="bg-surface-low rounded-2xl shadow-e1 p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 body-medium text-muted-foreground">
          <CalendarDays className="w-4 h-4" />
          {subs.length} active subscription{subs.length === 1 ? "" : "s"} tracked
        </div>
        <div className="text-right">
          <div className="label-small text-muted-foreground">Projected charges this month</div>
          <div className="font-mono title-medium">{fmtMoney(monthTotal)}</div>
        </div>
      </div>

      <div className="bg-surface-low rounded-3xl shadow-e1 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-outline-variant/60 bg-surface-container">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="px-2 py-2.5 label-small uppercase tracking-wider text-muted-foreground text-center"
            >
              {w}
            </div>
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
                className={`min-h-[110px] border-b border-r border-outline-variant/60 p-2 flex flex-col gap-1 transition-colors ${
                  inMonth ? "bg-surface-low" : "bg-surface-low/30 text-muted-foreground/40"
                } ${(i + 1) % 7 === 0 ? "border-r-0" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`label-medium font-mono ${
                      isToday
                        ? "bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-semibold"
                        : ""
                    }`}
                  >
                    {d.getDate()}
                  </span>
                  {dayTotal > 0 && inMonth && (
                    <span className="label-small font-mono text-muted-foreground">
                      {fmtMoney(dayTotal)}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1 overflow-hidden">
                  {items.slice(0, 3).map((it, idx) => (
                    <Popover key={idx}>
                      <PopoverTrigger asChild>
                        <button className="w-full text-left label-small truncate px-2 py-1 rounded-lg bg-primary-container text-primary-on-container hover:shadow-e1 transition-shadow flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: it.category_color ?? "currentColor" }}
                          />
                          <span className="truncate">{it.name}</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-60 rounded-2xl shadow-e3 p-4">
                        <div className="title-medium">{it.name}</div>
                        <div className="body-small text-muted-foreground capitalize">
                          {it.billing_cycle}
                        </div>
                        <div className="font-mono title-large mt-2 text-primary">
                          {fmtMoney(it.price)}
                        </div>
                        <div className="body-small text-muted-foreground mt-1">
                          Renews{" "}
                          {new Date(key).toLocaleDateString("en", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ))}
                  {items.length > 3 && (
                    <div className="label-small text-muted-foreground px-2">
                      +{items.length - 3} more
                    </div>
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
