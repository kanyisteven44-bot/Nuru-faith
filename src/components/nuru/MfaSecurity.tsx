import { useEffect, useState } from "react";
import { KeyRound, Loader2, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type TotpFactor = {
  id: string;
  friendly_name?: string | null;
  status: string;
};

export function MfaChallenge({
  onSuccess,
  title = "Two-step verification",
}: {
  onSuccess: () => void;
  title?: string;
}) {
  const [code, setCode] = useState("");
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (!active) return;
      if (error) toast.error(error.message);
      else setFactors(data.totp.filter((factor) => factor.status === "verified"));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function finishInlineSetup() {
    try {
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.error) throw assurance.error;
      if (assurance.data.currentLevel === "aal2") {
        onSuccess();
        return;
      }

      const listed = await supabase.auth.mfa.listFactors();
      if (listed.error) throw listed.error;
      const verified = listed.data.totp.filter((factor) => factor.status === "verified");
      setFactors(verified);
      if (verified.length) {
        toast.message("Authenticator enabled. Enter a fresh 6-digit code to verify this admin session.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not finish MFA setup");
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const factor = factors[0];
    if (!factor) {
      toast.error("No verified authenticator was found for this account.");
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setBusy(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (challenge.error) throw challenge.error;

      const result = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (result.error) throw result.error;
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="nuru-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-leaf">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Enter the current 6-digit code from your authenticator app.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 flex min-h-12 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-leaf" />
        </div>
      ) : factors.length === 0 ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
            <p className="text-xs font-semibold text-amber-200">
              Authenticator setup is incomplete for this admin account.
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-100/75">
              Sensitive admin actions need a verified authenticator. Finish setup below, then Nuru
              will return you to this approval flow automatically.
            </p>
          </div>
          <MfaSecurityPanel required onReady={() => void finishInlineSetup()} />
        </div>
      ) : (
        <form onSubmit={verify} className="mt-5 space-y-3">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            className="input-nuru text-center tracking-[0.35em]"
            aria-label="Authenticator code"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Verify securely
          </button>
        </form>
      )}
    </div>
  );
}

export function MfaSecurityPanel({
  required = false,
  onReady,
}: {
  required?: boolean;
  onReady?: () => void;
}) {
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [enrollment, setEnrollment] = useState<{
    id: string;
    qr: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");

  async function refresh() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    setFactors(data.totp);
  }

  useEffect(() => {
    let active = true;
    void supabase.auth.mfa
      .listFactors()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) toast.error(error.message);
        else setFactors(data.totp);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const verified = factors.filter((factor) => factor.status === "verified");

  async function beginEnrollment() {
    setBusy(true);
    try {
      // Refresh first so another tab/device cannot leave us with stale factor state.
      const listed = await supabase.auth.mfa.listFactors();
      if (listed.error) throw listed.error;
      const currentTotp = listed.data.totp;
      setFactors(currentTotp);

      // Never create another "Primary authenticator" when Supabase already has one.
      // A verified factor belongs in the challenge flow; an unfinished enrollment
      // must be removed before starting over.
      const currentVerified = currentTotp.filter((item) => item.status === "verified");
      if (currentVerified.length > 0 && verified.length === 0) {
        toast.message("Authenticator found. Enter its 6-digit code to continue.");
        onReady?.();
        return;
      }

      for (const factor of currentTotp.filter((item) => item.status !== "verified")) {
        const removed = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (removed.error) {
          // Continue with a unique name below. Some stale enrollments can exist on the
          // Auth server without being removable from an aal1 session.
          console.warn("Could not remove unfinished MFA factor", removed.error.message);
        }
      }

      // Friendly names must be unique for a user. Never reuse a fixed name such as
      // "Primary authenticator" because an abandoned enrollment can reserve it.
      const uniqueSuffix = Date.now().toString(36).slice(-6);
      const friendlyName =
        currentVerified.length === 0
          ? `Nuru authenticator ${uniqueSuffix}`
          : `Nuru backup authenticator ${uniqueSuffix}`;

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName,
      });
      if (error) throw error;

      setEnrollment({
        id: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setCode("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start MFA setup");
    } finally {
      setBusy(false);
    }
  }

  async function verifyEnrollment() {
    if (!enrollment || !/^\d{6}$/.test(code.trim())) {
      toast.error("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setBusy(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: enrollment.id });
      if (challenge.error) throw challenge.error;
      const verify = await supabase.auth.mfa.verify({
        factorId: enrollment.id,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verify.error) throw verify.error;

      setEnrollment(null);
      setCode("");
      await refresh();
      toast.success("Two-factor authentication is enabled");
      onReady?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That code could not be verified");
    } finally {
      setBusy(false);
    }
  }

  async function removeFactor(factor: TotpFactor) {
    if (!window.confirm("Remove this authenticator from your account?")) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) throw error;
      await supabase.auth.refreshSession();
      await refresh();
      toast.success("Authenticator removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove authenticator");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="nuru-card space-y-4 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-leaf">
          <KeyRound className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Authenticator app (TOTP)</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Protect your account with Google Authenticator, Microsoft Authenticator, Authy,
            1Password, or another TOTP app.
          </p>
          {required && (
            <p className="mt-2 text-xs font-medium text-sand">
              MFA is required for Nuru administrative accounts.
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-12 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-leaf" />
        </div>
      ) : (
        <>
          {verified.map((factor, index) => (
            <div
              key={factor.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3"
            >
              <Smartphone className="h-4 w-4 text-leaf" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">
                  {factor.friendly_name || `Authenticator ${index + 1}`}
                </p>
                <p className="text-[10px] text-leaf">Verified</p>
              </div>
              {!required || verified.length > 1 ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removeFactor(factor)}
                  aria-label="Remove authenticator"
                  className="rounded-lg p-2 text-destructive disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ))}

          {enrollment ? (
            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs font-semibold">1. Scan this QR code</p>
              <img
                src={enrollment.qr}
                alt="TOTP enrollment QR code"
                className="mx-auto h-44 w-44 rounded-xl bg-white p-2"
              />
              <div>
                <p className="text-[11px] text-muted-foreground">Manual setup key</p>
                <code className="mt-1 block break-all rounded-lg bg-background p-2 text-[11px] text-leaf">
                  {enrollment.secret}
                </code>
              </div>
              <p className="text-xs font-semibold">2. Enter the 6-digit code</p>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="input-nuru text-center tracking-[0.35em]"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void verifyEnrollment()}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Verify & enable
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void beginEnrollment()}
              className="min-h-11 w-full rounded-xl border border-primary/35 bg-primary/10 px-4 text-sm font-semibold text-leaf disabled:opacity-50"
            >
              {verified.length === 0 ? "Set up authenticator" : "Add backup authenticator"}
            </button>
          )}

          {verified.length > 0 && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Supabase does not issue recovery codes. Add a second authenticator on a separate
              device or securely store a backup factor.
            </p>
          )}
        </>
      )}
    </section>
  );
}
