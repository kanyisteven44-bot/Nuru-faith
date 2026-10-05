import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { newPasswordError } from "@/lib/accountSecurity";

export function AccountSecurityPanel() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [nonce, setNonce] = useState("");
  const [needsNonce, setNeedsNonce] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const issue = newPasswordError(password);
    if (issue || password !== confirm || password === current) {
      setError(
        issue ||
          (password !== confirm
            ? "The new passwords do not match."
            : "Choose a different new password."),
      );
      return;
    }
    setBusy(true);
    try {
      const { data, error: updateError } = await supabase.functions.invoke("delete-account", {
        body: { action: "change-password", password: current, newPassword: password, nonce },
      });
      if (updateError) {
        const payload =
          updateError.context instanceof Response
            ? await updateError.context.json().catch(() => null)
            : null;
        if (payload?.code === "reauthentication_needed") {
          const { error: reauthError } = await supabase.auth.reauthenticate();
          if (reauthError) throw reauthError;
          setNeedsNonce(true);
          setError("Enter the verification code sent to your email, then submit again.");
          return;
        }
        throw new Error(payload?.error || "Could not change your password. Please retry.");
      }
      if (!data?.updated) throw new Error("Password update was not confirmed.");
      setCurrent("");
      setPassword("");
      setConfirm("");
      setNonce("");
      setNeedsNonce(false);
      toast.success("Password changed successfully");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not change your password. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(event: React.FormEvent) {
    event.preventDefault();
    if (busy || deleteConfirmation !== "DELETE" || !deletePassword) return;
    setBusy(true);
    setError("");
    try {
      const { data, error: deletionError } = await supabase.functions.invoke("delete-account", {
        body: { password: deletePassword, confirmation: deleteConfirmation },
      });
      if (deletionError) {
        let message = "Could not delete your account. Please retry.";
        if (deletionError.context instanceof Response) {
          const payload = await deletionError.context.json().catch(() => null);
          message = payload?.error || message;
        }
        throw new Error(message);
      }
      if (!data?.deleted) throw new Error("Account deletion was not confirmed. Please retry.");
      await supabase.auth.signOut({ scope: "local" });
      qc.clear();
      toast.success("Your account has been deleted");
      void navigate({ to: "/auth", search: { mode: "login" }, replace: true });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not delete your account.");
    } finally {
      setBusy(false);
      setDeletePassword("");
    }
  }

  return (
    <div className="mt-5 space-y-6">
      {error && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <form
        onSubmit={(event) => void changePassword(event)}
        className="space-y-3 border-t border-border pt-5"
      >
        <h3 className="font-display text-lg font-semibold">Change password</h3>
        <p className="text-xs text-muted-foreground">
          Use 12–72 characters with uppercase, lowercase, a number and a symbol.
        </p>
        <label className="block text-sm">
          Current password
          <input
            required
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="input-nuru mt-1"
            disabled={busy}
          />
        </label>
        <label className="block text-sm">
          New password
          <input
            required
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-nuru mt-1"
            disabled={busy}
          />
        </label>
        <label className="block text-sm">
          Confirm new password
          <input
            required
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input-nuru mt-1"
            disabled={busy}
          />
        </label>
        {needsNonce && (
          <label className="block text-sm">
            Email verification code
            <input
              required
              autoComplete="one-time-code"
              value={nonce}
              onChange={(e) => setNonce(e.target.value)}
              className="input-nuru mt-1"
              disabled={busy}
            />
          </label>
        )}
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Please wait…" : "Update password"}
        </button>
        <p className="text-xs text-muted-foreground">
          Forgot your current password? Use “Forgot password?” on the sign-in screen.
        </p>
      </form>
      <section className="rounded-2xl border border-destructive/30 p-4">
        <h3 className="font-semibold text-destructive">Delete account</h3>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Permanently removes your account, profile, personal activity and uploaded files. Your
          messages may disappear from shared conversations. Shared groups and events remain. This
          cannot be undone.
        </p>
        {!deleteOpen ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setDeleteOpen(true);
              setError("");
            }}
            className="mt-3 min-h-11 rounded-full border border-destructive/40 px-4 text-sm font-semibold text-destructive"
          >
            Delete my account
          </button>
        ) : (
          <form onSubmit={(event) => void deleteAccount(event)} className="mt-4 space-y-3">
            <label className="block text-sm">
              Confirm your password
              <input
                required
                type="password"
                autoComplete="current-password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                disabled={busy}
                className="input-nuru mt-1"
              />
            </label>
            <label className="block text-sm">
              Type DELETE to confirm
              <input
                required
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                disabled={busy}
                autoComplete="off"
                className="input-nuru mt-1"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setDeleteOpen(false);
                  setDeletePassword("");
                  setDeleteConfirmation("");
                  setError("");
                }}
                className="min-h-11 rounded-full border border-border px-4 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || deleteConfirmation !== "DELETE" || !deletePassword}
                className="min-h-11 rounded-full bg-destructive px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Please wait…" : "Permanently delete account"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
