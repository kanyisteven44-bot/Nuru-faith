/** Curated official Spotify playback. The iframe is owned and served by Spotify. */
import { ArrowUpRight, Headphones, Music2, PlayCircle, ShieldCheck } from "lucide-react";

const PLAYLISTS = [
  { id: "1rfJqchMXm2IpEEeeQ1EJw", title: "East African Gospel", subtitle: "Kiswahili, English & East African praise", tag: "FEATURED PLAYLIST" },
] as const;

export function SpotifyWorship() {
  return (
    <section className="space-y-5 px-4 pb-8 pt-3" aria-label="Spotify gospel music">
      <div className="relative overflow-hidden rounded-[28px] border border-sky-300/20 bg-[#071a31] p-5 text-white shadow-[0_14px_36px_rgba(3,16,36,0.18)] sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-sky-400/15 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 left-12 h-40 w-60 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-200/20 bg-white/10">
            <Headphones className="h-6 w-6 text-sky-200" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-300">Nuru Faith listening</p>
            <h2 className="mt-1 font-display text-2xl font-semibold leading-tight sm:text-3xl">Worship that moves you.</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-300">Discover gospel sounds from home and beyond, all in one peaceful listening space.</p>
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-sky-100"><Music2 className="h-3.5 w-3.5" /> Gospel playlists</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-sky-100"><PlayCircle className="h-3.5 w-3.5" /> Official playback</span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Handpicked for you</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Featured worship</h2>
        </div>
        <a href="https://open.spotify.com/search/gospel%20worship" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground transition hover:border-primary/40">
          Explore <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {PLAYLISTS.map(playlist => (
        <article key={playlist.id} className="overflow-hidden rounded-[26px] border border-border/70 bg-card shadow-[0_10px_32px_rgba(8,30,60,0.07)]">
          <div className="flex items-center gap-3 px-4 pb-3 pt-5 sm:px-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0c2845] text-sky-200"><Music2 className="h-5 w-5" aria-hidden="true" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">{playlist.tag}</p>
              <h3 className="mt-0.5 font-display text-lg font-semibold leading-tight">{playlist.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{playlist.subtitle}</p>
            </div>
          </div>
          <div className="px-3 pb-3 sm:px-4">
            <iframe
              title={playlist.title + " official Spotify playlist"}
              src={"https://open.spotify.com/embed/playlist/" + playlist.id + "?utm_source=generator&theme=0"}
              loading="lazy"
              width="100%"
              height="352"
              className="block w-full rounded-2xl bg-[#171717]"
              style={{ border: 0 }}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3 sm:px-5">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Official Spotify player</span>
            <a href={"https://open.spotify.com/playlist/" + playlist.id} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#0b2b46] px-4 text-xs font-semibold text-white transition hover:bg-[#124365]">
              Open playlist <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </article>
      ))}

      <p className="px-2 text-center text-xs leading-relaxed text-muted-foreground">
        Spotify manages playback and music rights. Some tracks need a Spotify sign-in to play in full.
      </p>
    </section>
  );
}
