import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { startSpotifyConnect } from "@/lib/spotifyPkce";

export const Route = createFileRoute("/spotify/connect")({ component: SpotifyConnect });
function SpotifyConnect() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <main className="min-h-dvh bg-background text-foreground flex items-center justify-center p-6">
    <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4">
      <h1 className="text-2xl font-bold">Connect Spotify</h1>
      <p className="text-sm text-muted-foreground">Connect your Spotify account to Nuru Faith. This does not replace your Nuru login. Spotify access is subject to its developer policies and account eligibility.</p>
      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      <button disabled={busy} className="rounded-xl bg-primary text-primary-foreground px-5 py-3 disabled:opacity-50" onClick={() => {setBusy(true); void startSpotifyConnect().catch(() => {setError("Unable to open Spotify sign-in. Please retry.");setBusy(false);});}}>
        {busy ? "Opening Spotify…" : "Continue with Spotify"}
      </button>
      <div><Link className="underline text-sm" to="/home">Back to Nuru Faith</Link></div>
    </section>
  </main>;
}
