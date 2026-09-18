import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Lock, Mail, Phone, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { NuruGlyph } from "@/components/nuru/Logo";

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

type Method = "email" | "phone";

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const signup = mode === "signup";

  const [method, setMethod] = useState<Method>("email");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  async function submitEmail(e: React.FormEvent) {
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

      if (signup) {
        if (!fullName.trim()) throw new Error("Enter your full name");
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

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const value = phone.trim();
    if (!/^\+[1-9]\d{7,14}$/.test(value)) {
      toast.error("Enter your number in international format, e.g. +254712345678");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: value,
        options: signup ? { data: { full_name: fullName.trim() } } : {},
      });
      if (error) throw error;
      setOtpSent(true);
      toast.success("Code sent by SMS");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send the code");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phone.trim(),
        token: otp.trim(),
        type: "sms",
      });
      if (error) throw error;
      void navigate({ to: signup ? "/onboarding" : "/home" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That code didn't work");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth-callback`,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });
      if (error) throw error;
      if (!data.url) throw new Error("Google sign-in could not be started");
      // signInWithOAuth normally performs this redirect itself. Keeping this
      // explicit makes the flow reliable if the Supabase client is configured
      // with skipBrowserRedirect in a future release.
      window.location.assign(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in isn't available right now");
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh bg-background">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-7 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="flex flex-col items-center pt-4 text-center">
          <NuruGlyph className="h-16 w-16" />
          <h1 className="mt-4 font-display text-[26px] leading-none font-bold tracking-tight">
            Nuru <span className="text-cyan">Faith</span>
          </h1>
          <p className="mt-2 text-[12px] tracking-wide text-secondary-foreground">
            Connect • Grow • Live Your Faith
          </p>
        </div>

        <div className="pt-8">
          <h2 className="font-display text-[26px] leading-tight font-bold tracking-tight">
            {mode === "forgot"
              ? "Reset your password."
              : signup
                ? "Create Your Account"
                : "Welcome Back."}
          </h2>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {mode === "forgot"
              ? "We'll email you a link to set a new password."
              : signup
                ? "Start your journey with Nuru Faith."
                : "Sign in to continue your journey."}
          </p>
        </div>

        {sent ? (
          <div className="nuru-card mt-6 space-y-3 p-5 text-sm text-secondary-foreground">
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
                void navigate({ to: "/auth", search: { mode: "login" } });
              }}
            >
              Back to sign in
            </button>
          </div>
        ) : mode === "forgot" ? (
          <form onSubmit={submitEmail} className="mt-6 space-y-3">
            <Field icon={Mail} label="Email address">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                placeholder="you@email.com"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </Field>
            <SubmitButton busy={busy}>Send reset link</SubmitButton>
            <Link
              to="/auth"
              search={{ mode: "login" }}
              className="block pt-1 text-center text-[13px] text-cyan hover:underline"
            >
              Back to sign in
            </Link>
          </form>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void google()}
              className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-white text-sm font-semibold text-slate-900 transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              <GoogleGlyph /> Continue with Google
            </button>

            <div className="flex items-center gap-3 py-4">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] text-muted-foreground">
                or {signup ? "sign up" : "sign in"} with
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="flex gap-1 rounded-xl border border-border bg-surface-2/70 p-1">
              {(
                [
                  { value: "email", label: "Email", icon: Mail },
                  { value: "phone", label: "Phone", icon: Phone },
                ] as const
              ).map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold transition-colors",
                    method === m.value
                      ? "bg-surface text-foreground"
                      : "text-muted-foreground hover:text-secondary-foreground",
                  )}
                >
                  <m.icon className="h-4 w-4 text-cyan" /> {m.label}
                </button>
              ))}
            </div>

            {method === "email" ? (
              <form onSubmit={submitEmail} className="mt-4 space-y-3">
                {signup && (
                  <Field icon={UserIcon} label="Full name">
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                      required
                      maxLength={100}
                      placeholder="Stephen Kanyi"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </Field>
                )}
                <Field icon={Mail} label="Email address">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    placeholder="you@email.com"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </Field>
                <Field
                  icon={Lock}
                  label="Password"
                  hint={signup ? "At least 8 characters" : undefined}
                >
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={signup ? "new-password" : "current-password"}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </Field>

                {signup && (
                  <label className="flex items-start gap-2.5 pt-1 text-[12px] text-secondary-foreground">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
                    />
                    <span>
                      I agree to the{" "}
                      <span className="font-semibold text-cyan">Terms &amp; Conditions</span>
                    </span>
                  </label>
                )}

                <SubmitButton busy={busy} disabled={signup && !agreed}>
                  {signup ? "Create Account" : "Sign In"}
                </SubmitButton>

                {!signup && (
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
              <form onSubmit={otpSent ? verifyCode : sendCode} className="mt-4 space-y-3">
                {signup && !otpSent && (
                  <Field icon={UserIcon} label="Full name">
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                      required
                      maxLength={100}
                      placeholder="Stephen Kanyi"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </Field>
                )}
                <Field icon={Phone} label="Phone number" hint="Include your country code">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    required
                    disabled={otpSent}
                    placeholder="+254712345678"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
                  />
                </Field>

                {otpSent && (
                  <Field icon={Lock} label="Verification code" hint="6-digit code sent by SMS">
                    <input
                      inputMode="numeric"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      autoComplete="one-time-code"
                      required
                      maxLength={8}
                      placeholder="123456"
                      className="w-full bg-transparent text-sm tracking-[0.3em] outline-none placeholder:tracking-normal placeholder:text-muted-foreground"
                    />
                  </Field>
                )}

                <SubmitButton busy={busy}>
                  {otpSent ? "Verify & continue" : "Send code"}
                </SubmitButton>

                {otpSent && (
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                    }}
                    className="block w-full pt-1 text-center text-[13px] text-cyan hover:underline"
                  >
                    Use a different number
                  </button>
                )}
              </form>
            )}
          </>
        )}

        {mode !== "forgot" && (
          <p className="mt-auto pt-8 text-center text-[13px] text-muted-foreground">
            {signup ? "Already have an account? " : "Don't have an account? "}
            <Link
              to="/auth"
              search={{ mode: signup ? "login" : "signup" }}
              replace
              onClick={() => {
                setOtpSent(false);
                setSent(false);
              }}
              className="font-semibold text-cyan hover:underline"
            >
              {signup ? "Sign In" : "Sign Up"}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  hint,
  children,
}: {
  icon: typeof Mail;
  label: string;
  hint?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-secondary-foreground">
        {label}
      </span>
      <span className="flex min-h-12 items-center gap-2.5 rounded-xl border border-input bg-surface-2 px-3.5 focus-within:border-primary">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        {children}
      </span>
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function SubmitButton({
  busy,
  disabled = false,
  children,
}: {
  busy: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground nuru-glow-sm transition-opacity disabled:opacity-60"
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
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
