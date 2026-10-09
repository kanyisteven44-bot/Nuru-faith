import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { finishSpotifyConnect } from "@/lib/spotifyPkce";

export const Route = createFileRoute("/auth/spotify/callback" as never)({ component: SpotifyCallback });
function SpotifyCallback() {
  const [message, setMessage] = useState("Checking Spotify connection…");
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let active = true;
    void finishSpotifyConnect(window.location.search)
      .then(async token => {
        const response = await fetch("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Spotify could not verify the connected account.");
        const profile: { display_name?: string } = await response.json();
        // No token persistence: this verifies connectivity only, not a durable connection.
        if (active) {setConnected(true); setMessage(`Spotify verified for ${profile.display_name || "your account"}. Persistent connection and playback are not yet enabled.`);}
      })
      .catch(err => {if (active) setMessage(err instanceof Error ? err.message : "Spotify connection failed.");});
    return () => {active = false;};
  }, []);
  return <main className="min-h-dvh bg-background text-foreground flex items-center justify-center p-6">
    <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4">
      <h1 className="text-2xl font-bold">{connected ? "Spotify verified" : "Spotify connection"}</h1>
      <p role="status" className="text-sm">{message}</p>
      <a className="underline text-sm block" href="/spotify/connect">Connect again</a>
      <Link className="underline text-sm block" to="/home">Return to Nuru Faith</Link>
    </section>
  </main>;
}
