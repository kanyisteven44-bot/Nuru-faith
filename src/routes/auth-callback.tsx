import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NuruGlyph } from "@/components/nuru/Logo";

export const Route = createFileRoute("/auth-callback")({
  ssr: false,
  head: () => ({ meta: [{ title: "Signing in — Nuru Faith" }] }),
  component: GoogleAuthCallback,
});

function GoogleAuthCallback() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function finishSignIn() {
      const params = new URLSearchParams(window.location.search);
      const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const oauthError =
        params.get("error_description") ||
        fragment.get("error_description") ||
        params.get("error") ||
        fragment.get("error");

      if (oauthError) {
        if (active) setErrorMessage(oauthError.replace(/\+/g, " "));
        return;
      }

      // getSession waits for Supabase to finish processing OAuth tokens from
      // the callback URL and confirms that the browser now owns a real session.
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error || !data.session) {
        setErrorMessage(
          error?.message ?? "Google sign-in did not create a session. Please try again.",
        );
        return;
      }

      void navigate({ to: "/home", replace: true });
    }

    void finishSignIn();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-2 p-7">
        <NuruGlyph className="mx-auto h-16 w-16" />
        {errorMessage ? (
          <>
            <h1 className="mt-5 font-display text-xl font-semibold">Google sign-in failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
            <button
              type="button"
              onClick={() =>
                void navigate({ to: "/auth", search: { mode: "login" }, replace: true })
              }
              className="mt-6 min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto mt-5 h-6 w-6 animate-spin text-cyan" />
            <h1 className="mt-3 font-display text-xl font-semibold">Finishing your sign-in</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Please wait while Google returns you to Nuru Faith.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
