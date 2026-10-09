import { lazy, Suspense, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Headphones, Loader2, Music2, Play, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { CoverImage } from "@/components/nuru/CoverImage";
const ProfileMediaPlayback = lazy(async () => {
  const module = await import("@/components/youtube/MediaCatalog");
  return { default: module.MediaPlayback };
});
import { resolveMedia } from "@/lib/media";
import { fetchMediaCatalog, type MediaItem } from "@/services/media";
import { addProfileMusic, fetchProfileMusic, removeProfileMusic } from "@/services/profileMusic";
import { CardSkeleton, EmptyState } from "@/components/nuru/Primitives";

export function ProfileMusicFeature({
  memberId,
  onBrowse,
}: {
  memberId: string;
  onBrowse: () => void;
}) {
  const songs = useQuery({
    queryKey: ["profile-music", memberId],
    queryFn: () => fetchProfileMusic(memberId),
    enabled: !!memberId,
  });
  const [playing, setPlaying] = useState<MediaItem | null>(null);
  const featured = songs.data?.[0]?.item;
  return (
    <section
      className="mt-3 flex min-h-[64px] items-center gap-3 rounded-2xl border border-sky-500/25 bg-[linear-gradient(105deg,#0A233D,#103153)] px-3 py-2 text-white shadow-[0_6px_18px_rgba(3,14,31,0.12)]"
      aria-label="Profile song"
    >
      {featured ? (
        <>
          <button
            type="button"
            onClick={onBrowse}
            aria-label="Manage my profile soundtrack"
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
          >
            <MusicArtwork item={featured} className="h-10 w-10 shrink-0 rounded-xl" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[10px] font-bold uppercase tracking-[0.12em] text-sky-200">My profile soundtrack</span>
              <span className="mt-0.5 block truncate text-[13px] font-semibold">{featured.title}</span>
              <span className="block truncate text-[11px] text-blue-100/75">{featured.creator_name || "Gospel music"} · Manage</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPlaying(featured)}
            aria-label={"Play " + featured.title}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-400 text-[#092444] transition-colors hover:bg-sky-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
          >
            <Play className="h-[18px] w-[18px] fill-current" aria-hidden="true" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onBrowse}
          className="flex min-h-11 w-full items-center gap-2.5 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-400/15 text-sky-200">
            <Music2 className="h-[19px] w-[19px]" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[10px] font-bold uppercase tracking-[0.12em] text-sky-200">My profile soundtrack</span>
            <span className="mt-0.5 block truncate text-[12px] text-blue-100/85">
              {songs.isLoading ? "Loading songs…" : songs.isError ? "Browse worship songs" : "Add a worship song"}
            </span>
          </span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-300/25 bg-sky-400/15 text-sky-100">
            <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
        </button>
      )}
      {playing && (
        <Suspense fallback={<div role="status" className="fixed inset-0 z-[90] flex items-center justify-center bg-background/95 text-sm font-semibold">Opening music player…</div>}>
          <ProfileMediaPlayback item={playing} onClose={() => setPlaying(null)} />
        </Suspense>
      )}
    </section>
  );
}

function MusicArtwork({ item, className }: { item: MediaItem; className: string }) {
  return item.thumbnail_url ? (
    <CoverImage src={resolveMedia(item.thumbnail_url)} alt="" className={`${className} bg-slate-800 object-cover`} />
  ) : (
    <span className={`${className} flex items-center justify-center bg-[#173B59] text-blue-200`}>
      <Music2 className="h-7 w-7" />
    </span>
  );
}

/** Same shelf appears on your profile and in other members' public profiles.
 * Mutations are available to the owner only, and secured again with RLS. */
export function ProfileMusicSection({ memberId, editable }: { memberId: string; editable: boolean }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(0);
  const [playing, setPlaying] = useState<MediaItem | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => setPage(0), [term]);

  const songs = useQuery({
    queryKey: ["profile-music", memberId],
    queryFn: () => fetchProfileMusic(memberId),
    enabled: !!memberId,
  });
  const catalog = useQuery({
    queryKey: ["profile-music-catalog", term, page],
    queryFn: () => fetchMediaCatalog({ mediaType: "music", query: term, page }),
    enabled: editable && adding,
    placeholderData: (previous) => previous,
  });
  const selectedIds = new Set(songs.data?.map(({ item }) => item.id) ?? []);

  const add = useMutation({
    mutationFn: (id: string) => addProfileMusic(memberId, id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile-music", memberId] });
      toast.success("Song added to your profile");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Couldn't add song"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeProfileMusic(memberId, id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile-music", memberId] });
      toast.success("Song removed from profile");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Couldn't remove song"),
  });

  return (
    <section className="space-y-3 pb-5" aria-label="Profile music">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">My worship soundtrack</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {editable ? "Songs you choose appear on your public Nuru profile." : "Songs shared by this member."}
          </p>
        </div>
        {editable && (
          <button type="button" aria-expanded={adding} onClick={() => setAdding(v => !v)}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-bold text-primary-foreground">
            {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {adding ? "Close" : "Add song"}
          </button>
        )}
      </div>
      {songs.isLoading && <CardSkeleton count={2} height="h-16" />}
      {songs.isError && (
        <div className="rounded-2xl border border-border p-4 text-sm" role="alert">
          Couldn't load profile music.
          <button type="button" onClick={() => void songs.refetch()} className="ml-2 font-bold text-primary">Retry</button>
        </div>
      )}
      {songs.isSuccess && !songs.data.length && (
        <EmptyState title="No profile songs yet" description={editable ? "Add music from Nuru's approved catalogue to personalise your profile." : "This member hasn't shared a song yet."} />
      )}
      {!!songs.data?.length && (
        <div className="space-y-2">
          {songs.data.map(({ item }, index) => (
            <article key={item.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5">
              <button type="button" onClick={() => setPlaying(item)} aria-label={`Play ${item.title}`}
                className="relative shrink-0">
                <MusicArtwork item={item} className="h-14 w-14 rounded-xl" />
                <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/35 text-white">
                  <Play className="h-5 w-5 fill-current" />
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">{item.creator_name || "Nuru artist"}</p>
                {index === 0 && <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                  <Headphones className="h-3 w-3" /> Featured on profile
                </span>}
              </div>
              {editable && (
                <button type="button" disabled={remove.isPending} onClick={() => remove.mutate(item.id)}
                  aria-label={`Remove ${item.title} from profile`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground disabled:opacity-50">
                  {remove.isPending && remove.variables === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {editable && adding && (
        <div className="space-y-3 rounded-3xl border border-border-strong bg-surface-2 p-3.5">
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input aria-label="Search songs to add to profile" value={search} onChange={(event) => setSearch(event.target.value)}
              placeholder="Search gospel songs or artists" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          {catalog.isLoading && <CardSkeleton count={2} height="h-16" />}
          {catalog.isError && (
            <button type="button" onClick={() => void catalog.refetch()} className="min-h-11 text-sm font-semibold text-primary">
              Couldn't search songs. Tap to retry.
            </button>
          )}
          {catalog.isSuccess && catalog.data.items.length === 0 && (
            <p className="py-3 text-center text-sm text-muted-foreground">No approved songs match this search.</p>
          )}
          <div className="max-h-[420px] space-y-2 overflow-y-auto">
            {catalog.data?.items.map((item) => {
              const alreadyAdded = selectedIds.has(item.id);
              return (
                <div key={item.id} className="flex items-center gap-2 rounded-xl bg-card p-2">
                  <button type="button" aria-label={`Preview ${item.title}`} onClick={() => setPlaying(item)}>
                    <MusicArtwork item={item} className="h-11 w-11 rounded-lg" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">{item.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{item.creator_name || "Gospel artist"}</p>
                  </div>
                  <button type="button" disabled={alreadyAdded || add.isPending} onClick={() => add.mutate(item.id)}
                    className="inline-flex min-h-10 items-center gap-1 rounded-full bg-primary/15 px-3 text-xs font-bold text-primary disabled:opacity-60">
                    {alreadyAdded ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {alreadyAdded ? "Added" : "Add"}
                  </button>
                </div>
              );
            })}
          </div>
          {catalog.data && (page > 0 || catalog.data.hasMore) && (
            <div className="flex items-center justify-between gap-2 text-xs">
              <button type="button" disabled={page === 0 || catalog.isFetching} onClick={() => setPage(p => Math.max(0, p-1))}
                className="min-h-10 rounded-full border border-border px-4 disabled:opacity-40">Previous</button>
              <span className="text-muted-foreground">Page {page + 1}</span>
              <button type="button" disabled={!catalog.data.hasMore || catalog.isFetching} onClick={() => setPage(p => p+1)}
                className="min-h-10 rounded-full border border-border px-4 disabled:opacity-40">More songs</button>
            </div>
          )}
        </div>
      )}
      {playing && (
        <Suspense fallback={<div role="status" className="fixed inset-0 z-[90] flex items-center justify-center bg-background/95 text-sm font-semibold">Opening music player…</div>}>
          <ProfileMediaPlayback item={playing} onClose={() => setPlaying(null)} />
        </Suspense>
      )}
    </section>
  );
}
