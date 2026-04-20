import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  CreditCard,
  BarChart3,
  Bell,
  Wallet,
  LogOut,
  CalendarDays,
  Menu,
  X,
} from "lucide-react";
import logo from "@/assets/subtrak-logo.png";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const nav = [
  { to: "/app", end: true, label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/budget", label: "Budget", icon: Wallet },
  { to: "/app/alerts", label: "Alerts", icon: Bell },
];

const titleFor = (pathname: string) => {
  const item = [...nav].reverse().find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)));
  return item?.label ?? "Dashboard";
};

export default function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground body-medium">
        Loading…
      </div>
    );
  }

  const userInitial = (user.email ?? "?").charAt(0).toUpperCase();

  const NavItems = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex flex-col gap-1 flex-1">
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onClick}
          className={({ isActive }) => cn("nav-item", isActive && "nav-item-active")}
        >
          <item.icon className="w-[18px] h-[18px]" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-surface mesh-bg">
      {/* === Desktop Navigation Rail === */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar border-r border-sidebar-border sticky top-0 h-screen p-4">
        <div className="flex items-center gap-2.5 px-3 py-3 mb-4">
          <img src={logo} alt="SubTrak X" width={28} height={28} className="rounded-lg" />
          <div className="font-display title-large tracking-tight">
            SubTrak <span className="gradient-text">X</span>
          </div>
        </div>
        <NavItems />
        <div className="border-t border-sidebar-border pt-3 mt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-full hover:bg-sidebar-accent/50 transition-colors text-left">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center label-large font-semibold shrink-0">
                  {userInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="label-large truncate text-sidebar-foreground">{user.email}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-e3">
              <DropdownMenuLabel className="body-small text-muted-foreground truncate">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut();
                  navigate("/auth");
                }}
                className="gap-2 rounded-xl text-destructive focus:text-destructive"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* === Main column === */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top App Bar */}
        <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 md:px-6 bg-background/80 backdrop-blur-xl border-b border-outline-variant/60">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="md:hidden flex items-center gap-2">
            <img src={logo} alt="" width={24} height={24} className="rounded" />
            <span className="font-display title-medium">SubTrak <span className="gradient-text">X</span></span>
          </div>

          <h2 className="hidden md:block font-display title-large">{titleFor(location.pathname)}</h2>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* === Mobile drawer === */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 animate-fade-in">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-sidebar shadow-e4 p-4 flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5 px-2">
                <img src={logo} alt="SubTrak X" width={28} height={28} className="rounded-lg" />
                <div className="font-display title-large">SubTrak <span className="gradient-text">X</span></div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <NavItems onClick={() => setMobileOpen(false)} />
            <div className="border-t border-sidebar-border pt-3 mt-3">
              <button
                onClick={async () => {
                  await signOut();
                  navigate("/auth");
                }}
                className="w-full nav-item text-destructive"
              >
                <LogOut className="w-[18px] h-[18px]" /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
