import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/subtrak-logo.png";
import { ArrowRight, Database, Sparkles, Zap, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const features = [
  {
    icon: Database,
    title: "SQL-native intelligence",
    desc: "CTEs, window functions and triggers do the heavy lifting in PostgreSQL.",
  },
  {
    icon: Sparkles,
    title: "Waste detection",
    desc: "Find idle high-cost subscriptions before they drain your runway.",
  },
  {
    icon: Zap,
    title: "Predictive forecasting",
    desc: "Moving-average models predict next month's burn from real payments.",
  },
  {
    icon: Shield,
    title: "Health score",
    desc: "0–100 score factoring budget, income and unused services.",
  },
];

export default function Index() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen relative overflow-hidden bg-surface mesh-bg">
      {/* Top App Bar */}
      <header className="relative z-10 max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="SubTrak X logo" width={32} height={32} className="rounded-lg" />
          <span className="font-display title-large">
            SubTrak <span className="gradient-text">X</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button asChild variant="text" size="sm" className="hidden sm:inline-flex">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to={user ? "/app" : "/auth"}>{user ? "Open app" : "Get started"}</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-20 md:pt-28 pb-24 md:pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-container text-secondary-on-container label-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          Database-first financial intelligence
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-medium tracking-tight leading-[1.05] mb-6">
          Stop bleeding cash on
          <br />
          <span className="gradient-text">forgotten subscriptions.</span>
        </h1>
        <p className="body-large text-muted-foreground max-w-2xl mx-auto mb-10">
          A fintech intelligence engine where PostgreSQL runs the analytics — predictions, waste
          detection, health scoring — and React just shows you the truth.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button asChild size="lg">
            <Link to={user ? "/app" : "/auth"}>
              {user ? "Open dashboard" : "Start tracking"}
              <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="tonal">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-32 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="bg-surface-low rounded-3xl p-6 shadow-e1 hover:shadow-e3 transition-shadow duration-300 ease-m3-standard animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="w-11 h-11 rounded-2xl bg-primary-container text-primary-on-container flex items-center justify-center mb-4">
              <f.icon className="w-5 h-5" />
            </div>
            <h3 className="font-display title-medium mb-1">{f.title}</h3>
            <p className="body-medium text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
