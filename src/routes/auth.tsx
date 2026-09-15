import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowLeft, Loader2, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NuruMark } from "@/components/nuru/Logo";

const searchSchema = z.object({
  mode: z.enum(["login", "signup", "forgot"]).optional().default("login"),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Nuru Faith" },
      {
        name: "description",
        content: "Sign in or create your Nuru Faith account to continue your journey.",
      },
      { property: "og:title", content: "Sign in — Nuru Faith" },
      { property: "og:description", content: "Continue your journey with Nuru Faith." },
    ],
  }),
  component: AuthPage,
});

const credentials = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  /** The design leads with providers; the email form opens on demand. */
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (mode === "forgot") setShowEmailForm(true);
  }, [mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const parsed = z.string().email().safeParse(email.trim());
        if (!parsed.success) throw new Error("Enter a valid email address");
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent(true);
        toast.success("Password reset link sent");
        return;
      }

      const parsed = credentials.safeParse({ email, password });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check your details");

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Check your email to confirm your account");
          return;
        }
        void navigate({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        void navigate({ to: "/home" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: "google") {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/home` },
      });
      // On success the browser redirects to the provider now; Supabase owns the
      // session from here and hands control back at redirectTo.
      if (error) {
        toast.error(error.message || "Sign-in isn't available right now");
        setBusy(false);
      }
    } catch {
      toast.error("Sign-in isn't available right now");
      setBusy(false);
    }
  }

  const signup = mode === "signup";

  return (
    <div className="relative min-h-dvh bg-background">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-7 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
        {showEmailForm && mode !== "forgot" && (
          <button
            type="button"
            onClick={() => setShowEmailForm(false)}
            className="-ml-2 mb-2 flex w-fit items-center gap-1.5 rounded-full p-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}

        <div className="flex flex-col items-center pt-6 text-center">
          <NuruMark className="h-20 w-20" />
          <h1 className="mt-5 font-display text-[30px] leading-none font-bold tracking-tight">
            Nuru <span className="text-cyan">Faith</span>
          </h1>
          <p className="mt-2.5 text-[12px] tracking-wide text-secondary-foreground">
            Connect • Grow • Live Your Faith
          </p>
        </div>

        <div className="pt-10 text-center">
          <h2 className="font-display text-xl font-semibold">
            {mode === "forgot" ? "Reset your password" : signup ? "Create an account" : "Sign in"}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {mode === "forgot"
              ? "We'll email you a link to set a new password."
              : "Continue your faith journey"}
          </p>
        </div>

        {sent ? (
          <div className="nuru-card mt-8 space-y-3 p-5 text-sm text-secondary-foreground">
            <p className="font-display text-base font-semibold text-foreground">Check your email</p>
            <p>
              We sent a link to <span className="text-cyan">{email}</span>. Open it on this device
              to continue.
            </p>
            <button
              type="button"
              className="text-cyan hover:underline"
              onClick={() => {
                setSent(false);
                setShowEmailForm(false);
                void navigate({ to: "/auth", search: { mode: "login" } });
              }}
            >
              Back to sign in
            </button>
          </div>
        ) : showEmailForm ? (
          <form onSubmit={submit} className="mt-8 space-y-3">
            {signup && (
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                maxLength={100}
                className="input-nuru"
                placeholder="Full name"
                aria-label="Full name"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="input-nuru"
              placeholder="you@email.com"
              aria-label="Email"
            />
            {mode !== "forgot" && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={signup ? "new-password" : "current-password"}
                required
                minLength={8}
                className="input-nuru"
                placeholder="Password"
                aria-label="Password"
              />
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground nuru-glow-sm disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "forgot" ? "Send reset link" : signup ? "Create account" : "Sign in"}
            </button>
            {mode === "login" && (
              <Link
                to="/auth"
                search={{ mode: "forgot" }}
                className="block pt-1 text-center text-[13px] text-cyan hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </form>
        ) : (
          <div className="mt-8 space-y-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void social("google")}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-white text-sm font-semibold text-slate-900 transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              <GoogleGlyph /> Continue with Google
            </button>
            <button
              type="button"
              onClick={() => setShowEmailForm(true)}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-border-strong bg-surface-2 text-sm font-medium text-secondary-foreground transition-colors hover:text-foreground"
            >
              <Mail className="h-4.5 w-4.5 text-cyan" /> Continue with Email
            </button>
            <button
              type="button"
              onClick={() => toast("Phone sign-in isn't switched on yet — use email or Google.")}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-border-strong bg-surface-2 text-sm font-medium text-secondary-foreground transition-colors hover:text-foreground"
            >
              <Phone className="h-4.5 w-4.5 text-cyan" /> Continue with Phone
            </button>

            <div className="flex items-center gap-3 py-2">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] text-muted-foreground">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <Link
              to="/auth"
              search={{ mode: signup ? "login" : "signup" }}
              className="block text-center text-sm font-semibold text-cyan hover:underline"
            >
              {signup ? "I already have an account" : "Create an account"}
            </Link>
          </div>
        )}

        <p className="mt-auto pt-10 text-center text-[11px] leading-relaxed text-muted-foreground">
          By continuing, you agree to our Terms and
          <br />
          Privacy Policy.
        </p>
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 18 18" className="h-4.5 w-4.5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
