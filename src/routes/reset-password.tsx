import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GradientButton } from "@/components/nuru/Primitives";
import { NuruLogo } from "@/components/nuru/Logo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Nuru Faith" },
      { name: "description", content: "Choose a new password for your Nuru Faith account." },
      { property: "og:title", content: "Set a new password — Nuru Faith" },
      { property: "og:description", content: "Choose a new password for your account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/home" });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6">
      <div className="mb-8">
        <NuruLogo />
      </div>
      <h1 className="font-display text-2xl font-semibold">Set a new password</h1>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <label htmlFor="new-password" className="block text-xs font-medium text-muted-foreground">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-nuru"
          placeholder="••••••••"
        />
        <GradientButton type="submit" className="w-full" disabled={busy}>
          Update password
        </GradientButton>
      </form>
    </div>
  );
}
