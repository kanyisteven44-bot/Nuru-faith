import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { YouTubeAccountAccess } from "@/components/youtube/YouTubeAccountAccess";
import { NuruLockup } from "@/components/nuru/Logo";
import { MediaCatalog } from "@/components/youtube/MediaCatalog";

export const Route = createFileRoute("/youtube-account")({
  head: () => ({ meta: [{ title: "Listen inside Nuru — Nuru Faith" }] }),
  component: YouTubeAccountPage,
});
function YouTubeAccountPage() {
  const { userId, loading } = useAuth();
  const [mediaType, setMediaType] = useState<"music" | "podcast">("music");
  const [query, setQuery] = useState("");
  return (
    <main className="min-h-dvh bg-background px-5 py-10 text-foreground">
      <div className="mx-auto max-w-3xl pb-24">
        <NuruLockup />
        <div className="mt-8">
          <YouTubeAccountAccess />
        </div>
        <h1 className="mt-8 font-display text-3xl font-semibold">Listen inside Nuru</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Real songs and episodes. Play here and keep exploring.
        </p>
        {userId && (
          <>
            <div className="mt-5 flex gap-2" aria-label="Choose media">
              {(["music", "podcast"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={mediaType === type}
                  onClick={() => setMediaType(type)}
                  className={
                    mediaType === type
                      ? "min-h-11 rounded-full bg-primary px-5 text-primary-foreground"
                      : "min-h-11 rounded-full border border-border px-5"
                  }
                >
                  {type === "music" ? "Music" : "Podcasts"}
                </button>
              ))}
              <Link
                to="/reels"
                className="flex min-h-11 items-center rounded-full border border-border px-5"
              >
                Reels
              </Link>
            </div>
            <label className="mt-5 block text-sm">
              Search title or creator
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                className="input-nuru mt-2 w-full"
                placeholder="Find something to listen to…"
              />
            </label>
            <MediaCatalog mediaType={mediaType} query={query} />
          </>
        )}
        {!userId && (
          <div className="mt-6 rounded-3xl border border-border p-5">
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Checking your session…"
                : "Sign in to browse the approved music and podcast catalogue and watch Reels inside Nuru."}
            </p>
            {!loading && (
              <Link
                to="/auth"
                search={{ mode: "login" }}
                className="mt-4 inline-flex min-h-12 items-center rounded-2xl bg-primary px-5 font-semibold text-primary-foreground"
              >
                Sign in to Nuru
              </Link>
            )}
          </div>
        )}
        <Link to="/music" className="mt-6 inline-flex min-h-11 items-center text-sm text-primary">
          Back to Nuru music
        </Link>
      </div>
    </main>
  );
}
