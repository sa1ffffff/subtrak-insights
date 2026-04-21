import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/subtrak-logo.png";
import { ArrowRight, Database, Sparkles, Zap, Shield } from "lucide-react";

const features = [
  { icon: Database, title: "SQL-native intelligence", desc: "CTEs, window functions and triggers do the heavy lifting in PostgreSQL." },
  { icon: Sparkles, title: "Waste detection", desc: "Find idle high-cost subscriptions before they drain your runway." },
  { icon: Zap, title: "Predictive forecasting", desc: "Moving-average models predict next month's burn from real payments." },
  { icon: Shield, title: "Health score", desc: "0–100 score factoring budget, income and unused services." },
];

export default function Index() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <header className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="SubTrak X logo" width={32} height={32} />
          <span className="font-display font-semibold text-lg">SubTrak <span className="gradient-text">X</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
          <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            <Link to={user ? "/app" : "/auth"}>{user ? "Open app" : "Get started"}</Link>
          </Button>
        </div>
      </header>

      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/60 bg-card/40 backdrop-blur text-xs text-muted-foreground mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-glow" />
          Database-first financial intelligence
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-semibold tracking-tighter leading-[1.05] mb-6">
          Stop bleeding cash on<br />
          <span className="gradient-text">forgotten subscriptions.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          A smart subscription tracker that finds wasted spending, predicts your next bill, and keeps your budget healthy. All your recurring payments in one clear view.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
            <Link to={user ? "/app" : "/auth"}>{user ? "Open dashboard" : "Start tracking"} <ArrowRight className="ml-2 w-4 h-4" /></Link>
          </Button>
        </div>
      </section>

      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-32 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((f) => (
          <div key={f.title} className="glass-card p-6 animate-fade-in">
            <div className="w-9 h-9 rounded-lg bg-gradient-primary/20 border border-primary/30 flex items-center justify-center mb-4">
              <f.icon className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-display font-semibold mb-1">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
