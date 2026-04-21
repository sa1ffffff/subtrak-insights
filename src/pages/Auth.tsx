import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/subtrak-logo.png";

const getRedirectUrl = (path: string) => {
  const configuredSiteUrl = import.meta.env.VITE_SITE_URL?.toString().trim();
  const baseUrl = configuredSiteUrl && configuredSiteUrl.length > 0 ? configuredSiteUrl : window.location.origin;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${baseUrl.replace(/\/+$/, "")}${normalizedPath}`;
};

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Something went wrong";
};

const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-1.5 3.6-5.5 3.6-3.3 0-6-2.8-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.6-2.5C16.9 2.9 14.7 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c5.3 0 8.8-3.7 8.8-8.9 0-.6-.1-1-.2-1.4H12Z" />
    <path fill="#34A853" d="M3.8 7.4 7 9.8C7.8 7.8 9.8 6.4 12 6.4c1.9 0 3.2.8 3.9 1.5l2.6-2.5C16.9 2.9 14.7 2 12 2 8.4 2 5.3 4 3.8 7.4Z" />
    <path fill="#FBBC04" d="M12 20.4c2.7 0 5-1 6.7-2.6l-3.1-2.5c-.8.6-2 1-3.6 1-3.9 0-5.3-2.3-5.6-3.5l-3.2 2.5C4.6 18.4 8 20.4 12 20.4Z" />
    <path fill="#4285F4" d="M20.8 11.5c0-.6-.1-1-.2-1.4H12V14h5.3c-.2 1.2-1 2.1-1.8 2.7l3.1 2.5c1.8-1.6 2.8-4.1 2.8-7.7Z" />
  </svg>
);

export default function Auth() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const loading = emailLoading || googleLoading;

  useEffect(() => { if (user) navigate("/app", { replace: true }); }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: getRedirectUrl("/app") },
        });
        if (error) throw error;
        toast.success("Account created. Welcome aboard.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setEmailLoading(false);
    }
  };

  const google = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getRedirectUrl("/auth/callback"),
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="relative z-10 w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <img src={logo} alt="SubTrak X" width={32} height={32} />
          <span className="font-display font-semibold text-lg">SubTrak <span className="gradient-text">X</span></span>
        </Link>
        <div className="glass-card p-8">
          <h1 className="font-display text-2xl font-semibold mb-1">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "signin" ? "Sign in to your dashboard." : "Start optimizing your subscriptions today."}
          </p>

          <Button
            type="button"
            variant="outline"
            className="w-full mb-4 h-11 border-border/80 bg-background/50 hover:bg-muted/80"
            onClick={google}
            disabled={loading}
          >
            {googleLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Redirecting to Google...
              </>
            ) : (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            )}
          </Button>

          <div className="flex items-center gap-3 my-4 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
              {emailLoading ? "Loading..." : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            disabled={loading}
            className="w-full text-sm text-muted-foreground hover:text-foreground mt-4 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mode === "signin" ? "No account? Create one" : "Have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
