import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell, PageHeader } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2, Pause, Play } from "lucide-react";

type Sub = {
  id: string;
  name: string;
  price: number;
  billing_cycle: "monthly" | "yearly" | "weekly" | "quarterly";
  status: string;
  next_billing_date: string | null;
  category_id: string | null;
  service_id: string | null;
  start_date: string;
  category_name?: string | null;
  normalized_monthly_cost?: number | null;
};

export default function Subscriptions() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [services, setServices] = useState<{ id: string; name: string; category_id: string | null }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", billing_cycle: "monthly", service_id: "", category_id: "" });

  const load = async () => {
    if (!user) return;
    const [{ data: s }, { data: sv }, { data: c }] = await Promise.all([
      supabase.from("active_subscriptions").select("*").eq("user_id", user.id).order("normalized_monthly_cost", { ascending: false }),
      supabase.from("services").select("id,name,category_id").order("name"),
      supabase.from("categories").select("id,name").order("name"),
    ]);
    setSubs((s as any) ?? []);
    setServices((sv as any) ?? []);
    setCategories((c as any) ?? []);
  };

  useEffect(() => { load(); }, [user]);

  const submit = async () => {
    if (!user) return;
    const payload: any = {
      user_id: user.id,
      name: form.name || services.find((s) => s.id === form.service_id)?.name || "Untitled",
      price: Number(form.price),
      billing_cycle: form.billing_cycle as any,
      service_id: form.service_id || null,
      category_id: form.category_id || services.find((s) => s.id === form.service_id)?.category_id || null,
    };
    const { error } = await supabase.from("subscriptions").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Subscription added");
    setOpen(false);
    setForm({ name: "", price: "", billing_cycle: "monthly", service_id: "", category_id: "" });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("subscriptions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    load();
  };

  const toggle = async (s: Sub) => {
    const next = s.status === "active" ? "paused" : "active";
    const { error } = await supabase.from("subscriptions").update({ status: next as any }).eq("id", s.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <PageShell>
      <PageHeader
        title="Subscriptions"
        subtitle="Manage every recurring charge in one place."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1" /> Add subscription</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New subscription</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Service</Label>
                  <Select value={form.service_id} onValueChange={(v) => setForm({ ...form, service_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pick a service or leave blank" /></SelectTrigger>
                    <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Custom name (optional)</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Netflix Premium" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Price</Label>
                    <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  </div>
                  <div>
                    <Label>Cycle</Label>
                    <Select value={form.billing_cycle} onValueChange={(v) => setForm({ ...form, billing_cycle: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Category (optional override)</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Auto from service" /></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submit} className="bg-gradient-primary text-primary-foreground">Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Service</th>
              <th className="text-left px-4 py-3 font-medium">Category</th>
              <th className="text-right px-4 py-3 font-medium">Price</th>
              <th className="text-left px-4 py-3 font-medium">Cycle</th>
              <th className="text-right px-4 py-3 font-medium">Mo. cost</th>
              <th className="text-left px-4 py-3 font-medium">Next billing</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {subs.length === 0 && (
              <tr><td colSpan={8} className="text-center text-muted-foreground py-12">No subscriptions yet — add your first one.</td></tr>
            )}
            {subs.map((s) => (
              <tr key={s.id} className="border-t border-border/60 hover:bg-muted/30 transition">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.category_name ?? "—"}</td>
                <td className="px-4 py-3 text-right font-mono">{fmtMoney(s.price)}</td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{s.billing_cycle}</td>
                <td className="px-4 py-3 text-right font-mono">{fmtMoney(s.normalized_monthly_cost)}</td>
                <td className="px-4 py-3 text-muted-foreground">{fmtDate(s.next_billing_date)}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={
                    s.status === "active" ? "border-success/40 text-success" :
                    s.status === "at_risk" ? "border-destructive/40 text-destructive" :
                    "border-muted-foreground/30 text-muted-foreground"
                  }>{s.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => toggle(s)} title={s.status === "active" ? "Pause" : "Activate"}>
                      {s.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(s.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
