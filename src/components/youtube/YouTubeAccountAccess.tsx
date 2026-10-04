import { ExternalLink, Music2, Youtube } from "lucide-react";

/** Official account handoff. Nuru cannot infer or store a YouTube login here. */
export function YouTubeAccountAccess() {
  return (
    <section
      aria-label="Your YouTube account"
      className="rounded-3xl border border-primary/25 bg-surface-1 p-5 sm:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
          <Youtube aria-hidden="true" className="h-6 w-6" />
        </span>
        <div>
          <h2 className="font-display text-xl font-semibold">Your music. Your YouTube account.</h2>
          <p className="mt-1 text-xs text-muted-foreground">Continue on the official service</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Open YouTube or YouTube Music, tap your profile and sign in with your Google account. If you
        are already signed in, use your existing account or switch accounts there.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <a
          href="https://music.youtube.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-nuru-primary flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold"
        >
          <Music2 aria-hidden="true" className="h-4 w-4" />
          Open YouTube Music
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
          <span className="sr-only"> (opens outside Nuru)</span>
        </a>
        <a
          href="https://www.youtube.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-semibold hover:bg-surface-2"
        >
          <Youtube aria-hidden="true" className="h-4 w-4" />
          Open YouTube
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
          <span className="sr-only"> (opens outside Nuru)</span>
        </a>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Your playlists, comments and any eligible Premium features are available on YouTube. Offline
        downloads stay in its official apps. This does not link or import your account into Nuru.
      </p>
    </section>
  );
}
