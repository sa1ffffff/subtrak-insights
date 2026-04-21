import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Authentication failed";
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
        if (authCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(authCode);
          if (error) throw error;
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;
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
