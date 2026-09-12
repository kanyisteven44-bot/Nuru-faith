import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Apple, Loader2, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NuruLogo } from "@/components/nuru/Logo";
import { GradientButton } from "@/components/nuru/Primitives";
import hero from "@/assets/cross-sunrise.jpg";

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

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
        navigate({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        navigate({ to: "/home" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: "google" | "apple") {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/home`,
        },
      });
      // On success the browser is redirected to the provider now; Supabase
      // owns the session from here and will hand control back at redirectTo.
      if (error) {
        toast.error(error.message || "Sign-in isn't available right now");
        setBusy(false);
      }
    } catch {
      toast.error("Sign-in isn't available right now");
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh bg-background">
      <img
        src={hero}
        alt=""
        width={1024}
        height={640}
        className="absolute inset-0 h-64 w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 nuru-veil" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-10">
        <div className="mb-10">
          <NuruLogo />
        </div>

        <h1 className="font-display text-2xl font-semibold">
          {mode === "signup"
            ? "Start your journey"
            : mode === "forgot"
              ? "Reset your password"
              : "Welcome back"}
        </h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          {mode === "signup"
            ? "Create an account to join your church and community."
            : mode === "forgot"
              ? "We'll email you a link to set a new password."
              : "Sign in to continue your journey."}
        </p>

        {sent ? (
          <div className="nuru-card space-y-3 p-5 text-sm text-secondary-foreground">
            <p className="font-display text-base font-semibold text-foreground">Check your email</p>
            <p>
              We sent a link to <span className="text-cyan">{email}</span>. Open it on this device
              to continue.
            </p>
            <Link
              to="/auth"
              search={{ mode: "login" }}
              className="inline-block text-cyan hover:underline"
              onClick={() => setSent(false)}
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <Field label="Full name" id="name">
                <input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  maxLength={100}
                  className="input-nuru"
                  placeholder="Stephen Mwangi"
                />
              </Field>
            )}
            <Field label="Email" id="email">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="input-nuru"
                placeholder="you@email.com"
              />
            </Field>
            {mode !== "forgot" && (
              <Field label="Password" id="password">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  className="input-nuru"
                  placeholder="••••••••"
                />
              </Field>
            )}

            {mode === "login" && (
              <div className="flex justify-end">
                <Link
                  to="/auth"
                  search={{ mode: "forgot" }}
                  className="text-xs text-cyan hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <GradientButton type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset link"
                  : "Log in"}
            </GradientButton>
          </form>
        )}

        {mode !== "forgot" && !sent && (
          <>
            <div className="my-6 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or continue with{" "}
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              <SocialButton onClick={() => social("google")} disabled={busy}>
                <Mail className="h-4 w-4" /> Continue with Google
              </SocialButton>
              <SocialButton onClick={() => social("apple")} disabled={busy}>
                <Apple className="h-4 w-4" /> Continue with Apple
              </SocialButton>
              <SocialButton disabled title="Phone sign-in is coming soon">
                <Phone className="h-4 w-4" /> Continue with Phone
              </SocialButton>
            </div>
          </>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <Link to="/auth" search={{ mode: "login" }} className="font-semibold text-cyan">
                Log in
              </Link>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <Link to="/auth" search={{ mode: "signup" }} className="font-semibold text-cyan">
                Sign up
              </Link>
            </>
          )}
        </p>
        <p className="script mt-6 text-center text-xl text-cyan/80">
          A brighter generation in Christ.
        </p>
      </div>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function SocialButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-surface-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent disabled:opacity-50"
    >
      {children}
    </button>
  );
}
