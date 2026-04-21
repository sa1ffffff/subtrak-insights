import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, CreditCard, BarChart3, Bell, Wallet, LogOut, CalendarDays } from "lucide-react";
import logo from "@/assets/subtrak-logo.png";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const nav = [
  { to: "/app", end: true, label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/budget", label: "Budget", icon: Wallet },
  { to: "/app/alerts", label: "Alerts", icon: Bell },
];

export default function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 border-r border-border/60 bg-sidebar flex flex-col p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-2 py-2 mb-6">
          <img src={logo} alt="SubTrak X" width={28} height={28} className="rounded" />
          <div className="font-display font-semibold tracking-tight text-lg">SubTrak <span className="gradient-text">X</span></div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:translate-x-1 hover:shadow-md ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`
              }
            >
              <item.icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border/60 pt-4 mt-4">
          <div className="text-xs text-muted-foreground truncate px-2 mb-2">{user.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={async () => { await signOut(); navigate("/auth"); }}>
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
