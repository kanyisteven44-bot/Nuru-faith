import { Youtube } from "lucide-react";

export function YouTubeAccountAccess() {
  return (
    <section
      aria-label="YouTube connection"
      className="rounded-3xl border border-border bg-surface-1 p-5"
    >
      <div className="flex items-center gap-3">
        <Youtube aria-hidden="true" className="h-6 w-6 shrink-0 text-red-500" />
        <h2 className="font-display text-lg font-semibold">YouTube inside Nuru</h2>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Watch approved videos in Music and swipe through Reels using the official YouTube player.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Personal account connection is not configured yet. Your YouTube playlists, comments and
        downloads are not synced. Nuru comments and saved Reels belong to your Nuru account.
      </p>
    </section>
  );
}
