/** Official Spotify embeds. Spotify handles account access, availability and playback. */
const PLAYLISTS = [
  { id: "1rfJqchMXm2IpEEeeQ1EJw", title: "East African Gospel", subtitle: "Kiswahili, English and regional worship" },
] as const;
export function SpotifyWorship() {
  return <section className="space-y-4 px-4 py-5" aria-label="Spotify gospel music">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-semibold">Gospel on Spotify</h2>
        <p className="mt-1 text-sm text-muted-foreground">Listen to curated gospel playlists through Spotify's official player. Some songs require signing into Spotify to play in full.</p>
      </div>
      <a href="https://open.spotify.com/search/gospel%20worship" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-semibold">Explore on Spotify ↗</a>
    </div>
    {PLAYLISTS.map(p => <div key={p.id} className="nuru-card space-y-2 overflow-hidden p-3">
      <div><h3 className="font-semibold">{p.title}</h3><p className="text-xs text-muted-foreground">{p.subtitle}</p></div>
      <iframe title={p.title + " Spotify playlist"} src={"https://open.spotify.com/embed/playlist/" + p.id + "?utm_source=generator"} loading="lazy" width="100%" height="352" style={{border:0,borderRadius:12}} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
      <a className="inline-flex min-h-11 items-center text-sm text-primary underline" target="_blank" rel="noopener noreferrer" href={"https://open.spotify.com/playlist/" + p.id}>Open playlist in Spotify ↗</a>
    </div>)}
    <p className="text-xs text-muted-foreground">Songs stay on Spotify and are not copied to Nuru Faith. Playback and availability depend on Spotify's rules and your account.</p>
  </section>;
}
