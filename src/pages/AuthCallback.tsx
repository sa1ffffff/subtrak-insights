import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Authentication failed";
};

const waitForSession = async (attempts: number, intervalMs: number) => {
  for (let i = 0; i < attempts; i += 1) {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) throw error;
    if (session) return session;

    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return null;
};

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const finalizeAuth = async () => {
      const url = new URL(window.location.href);
      const authCode = url.searchParams.get("code");
      const errorDescription = url.searchParams.get("error_description");
      const oauthError = url.searchParams.get("error");
      const hashErrorParams = new URLSearchParams(url.hash.replace(/^#/, ""));
      const hashError = hashErrorParams.get("error_description") ?? hashErrorParams.get("error");

      if (errorDescription || oauthError || hashError) {
        toast.error(errorDescription ?? hashError ?? oauthError ?? "Unable to sign in.");
        navigate("/auth", { replace: true });
        return;
      }

      try {
        // Supabase browser client typically auto-exchanges code from URL.
        const sessionFromAutoExchange = await waitForSession(15, 200);
        if (sessionFromAutoExchange) {
          navigate("/app", { replace: true });
          return;
        }

        // Fallback for cases where auto-exchange did not complete.
        if (authCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(authCode);
          if (error) throw error;
        }

        const session = await waitForSession(10, 200);
        if (!session) throw new Error("Authentication session not found. Please try again.");

        navigate("/app", { replace: true });
      } catch (error: unknown) {
        toast.error(getErrorMessage(error));
        navigate("/auth", { replace: true });
      }
    };

    void finalizeAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="glass-card p-8 w-full max-w-md text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-4 text-primary" />
        <h1 className="font-display text-xl font-semibold mb-2">Completing sign in</h1>
        <p className="text-sm text-muted-foreground">
          Please wait while we securely finish your authentication.
        </p>
      </div>
    </div>
  );
}
