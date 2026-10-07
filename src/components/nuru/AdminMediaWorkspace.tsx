import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Music2,
  Podcast,
  Search,
  ShieldCheck,
  Sparkles,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  adminYouTubeSearch,
  approveYouTubeSource,
  approveYouTubeVideo,
  reviewMediaItem,
} from "@/lib/mediaAdmin.functions";
import { youtubeLookup } from "@/lib/youtube.functions";
import { parseYouTubeUrl } from "@/services/youtubeService";
import { InAppMediaPlayer, YouTubeNotice } from "@/components/youtube/InAppMediaPlayer";
import { MusicCatalogImport } from "@/components/youtube/MusicCatalogImport";
import { GhostButton, PillTabs, PrimaryButton } from "@/components/nuru/Primitives";
import { MfaChallenge } from "@/components/nuru/MfaSecurity";

const TABS = ["Artists", "Songs", "Podcasts", "Pending", "Importer"] as const;
type Tab = (typeof TABS)[number];
const SOURCE_KINDS = ["music", "podcast", "mixed"] as const;
type SourceKind = (typeof SOURCE_KINDS)[number];

type ChannelCandidate = {
  channelId: string;
  title: string;
  description: string;
  thumbnail: string;
  subscriberCount: string | null;
};

type VideoCandidate = {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelId: string;
  channelName: string;
  publishedAt: string;
  durationSeconds: number;
};

export function AdminMediaWorkspace() {
  const client = useQueryClient();
  const [tab, setTab] = useState<Tab>("Artists");
  const [query, setQuery] = useState("");
  const [paste, setPaste] = useState("");
  const [sourceKind, setSourceKind] = useState<SourceKind>("music");
  const [selectedChannel, setSelectedChannel] = useState<ChannelCandidate | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoCandidate | null>(null);
  const [needsMfa, setNeedsMfa] = useState(false);
  const [presetChannelId, setPresetChannelId] = useState("");
  const [presetKind, setPresetKind] = useState<"music" | "podcast">("music");

  const summary = useQuery({
    queryKey: ["admin-media-workspace-summary"],
    queryFn: async () => {
      const [sources, music, podcasts, pending] = await Promise.all([
        supabase
          .from("media_sources")
          .select("content_kind,is_approved,is_verified,source_type"),
        supabase
          .from("media_items")
          .select("id", { count: "exact", head: true })
          .eq("source", "youtube")
          .eq("media_type", "music")
          .eq("is_approved", true),
        supabase
          .from("media_items")
          .select("id", { count: "exact", head: true })
          .eq("source", "youtube")
          .eq("media_type", "podcast")
          .eq("is_approved", true),
        supabase
          .from("media_items")
          .select("id", { count: "exact", head: true })
          .eq("source", "youtube")
          .eq("is_approved", false),
      ]);
      if (sources.error) throw sources.error;
      if (music.error) throw music.error;
      if (podcasts.error) throw podcasts.error;
      if (pending.error) throw pending.error;
      const reviewed = (sources.data ?? []).filter(
        (row) => row.source_type === "youtube" && row.is_approved && row.is_verified,
      );
      return {
        musicSources: reviewed.filter((row) => ["music", "mixed"].includes(row.content_kind)).length,
        podcastSources: reviewed.filter((row) => ["podcast", "mixed"].includes(row.content_kind)).length,
        music: music.count ?? 0,
        podcasts: podcasts.count ?? 0,
        pending: pending.count ?? 0,
      };
    },
    staleTime: 15_000,
    refetchInterval: 60_000,
  });

  const pendingItems = useQuery({
    queryKey: ["admin-media-pending-items"],
    queryFn: async () => {
      const result = await supabase
        .from("media_items")
        .select(
          "id,title,creator_name,thumbnail_url,media_type,external_id,youtube_channel_id,created_at,is_featured",
        )
        .eq("source", "youtube")
        .eq("is_approved", false)
        .in("media_type", ["music", "podcast"])
        .order("created_at", { ascending: false })
        .limit(30);
      if (result.error) throw result.error;
      return result.data ?? [];
    },
    enabled: tab === "Pending",
    staleTime: 10_000,
  });

  const search = useMutation({
    mutationFn: async () => {
      const term = query.trim();
      if (term.length < 2) throw new Error("Enter at least two characters.");
      const type = tab === "Artists" ? "channel" : "video";
      return adminYouTubeSearch({ data: { query: term, type, maxResults: 12 } });
    },
    onSuccess: () => {
      setSelectedChannel(null);
      setSelectedVideo(null);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "YouTube search failed."),
  });

  const lookup = useMutation({
    mutationFn: async () => {
      const parsed = parseYouTubeUrl(paste);
      if (!parsed) throw new Error("Paste a YouTube video or /channel/ link, or a bare YouTube ID.");
      if (parsed.kind === "playlist") throw new Error("Use a video or channel link for approval.");
      const result = await youtubeLookup({ data: parsed });
      if (result.error || !result.item) throw new Error("That YouTube item could not be loaded.");
      return { parsed, item: result.item };
    },
    onSuccess: ({ parsed, item }) => {
      if (parsed.kind === "channel" && "youtubeChannelId" in item) {
        setTab("Artists");
        setSelectedVideo(null);
        setSelectedChannel({
          channelId: item.youtubeChannelId,
          title: item.title,
          description: item.description,
          thumbnail: item.thumbnail,
          subscriberCount: item.subscriberCount,
        });
      } else if (parsed.kind === "video" && "youtubeVideoId" in item) {
        setSelectedChannel(null);
        setSelectedVideo({
          videoId: item.youtubeVideoId,
          title: item.title,
          description: item.description,
          thumbnail: item.thumbnail,
          channelId: item.channelId,
          channelName: item.channelName,
          publishedAt: item.publishedAt,
          durationSeconds: 0,
        });
        if (tab === "Artists" || tab === "Pending" || tab === "Importer") setTab("Songs");
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "YouTube lookup failed."),
  });

  function approvalError(error: unknown) {
    const message = error instanceof Error ? error.message : "Approval failed.";
    if (/authenticator|aal2|assurance|verification/i.test(message)) setNeedsMfa(true);
    toast.error(message);
  }

  const approveSource = useMutation({
    mutationFn: async () => {
      if (!selectedChannel) throw new Error("Choose a YouTube channel first.");
      return approveYouTubeSource({
        data: {
          channelId: selectedChannel.channelId,
          contentKind: sourceKind,
          languageCodes: ["en"],
        },
      });
    },
    onSuccess: async (result) => {
      await client.invalidateQueries({ queryKey: ["admin-media-workspace-summary"] });
      await client.invalidateQueries({ queryKey: ["media-sources"] });
      setPresetChannelId(result.channelId);
      setPresetKind(result.contentKind === "podcast" ? "podcast" : "music");
      toast.success(`${result.name} is approved and ready for catalogue scanning.`);
    },
    onError: approvalError,
  });

  const approveVideo = useMutation({
    mutationFn: async () => {
      if (!selectedVideo) throw new Error("Choose a YouTube video first.");
      return approveYouTubeVideo({
        data: {
          videoId: selectedVideo.videoId,
          mediaType: tab === "Podcasts" ? "podcast" : "music",
        },
      });
    },
    onSuccess: async (result) => {
      await client.invalidateQueries({ queryKey: ["admin-media-workspace-summary"] });
      await client.invalidateQueries({ queryKey: ["media-catalog"] });
      toast.success(`${result.title} is approved in Nuru.`);
    },
    onError: approvalError,
  });

  const approvePending = useMutation({
    mutationFn: (id: string) => reviewMediaItem({ data: { id, approved: true } }),
    onSuccess: async (result) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin-media-workspace-summary"] }),
        client.invalidateQueries({ queryKey: ["admin-media-pending-items"] }),
        client.invalidateQueries({ queryKey: ["admin-dashboard-media-summary"] }),
      ]);
      toast.success(`${result.title} approved.`);
    },
    onError: approvalError,
  });

  const channelResults = search.data?.channels ?? [];
  const videoResults = search.data?.videos ?? [];
  const activeVideoType = tab === "Podcasts" ? "podcast" : "music";
  const suggestions = useMemo(
    () =>
      tab === "Artists"
        ? ["Kenyan gospel artists", "African gospel worship", "Christian worship artist"]
        : tab === "Podcasts"
          ? ["Christian podcast", "Bible podcast", "Christian youth podcast"]
          : ["gospel music", "worship song", "Kenyan gospel song"],
    [tab],
  );

  return (
    <div className="space-y-4">
      {needsMfa && (
        <MfaChallenge
          title="Verify before approving YouTube media"
          onSuccess={() => {
            setNeedsMfa(false);
            toast.success("Admin session verified. You can approve media now.");
          }}
        />
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Approved artists" value={summary.data?.musicSources ?? "—"} icon={Music2} />
        <SummaryCard label="Podcast creators" value={summary.data?.podcastSources ?? "—"} icon={Podcast} />
        <SummaryCard label="Approved songs" value={summary.data?.music ?? "—"} icon={BadgeCheck} />
        <SummaryCard label="Video podcasts" value={summary.data?.podcasts ?? "—"} icon={Youtube} />
        <SummaryCard label="Pending review" value={summary.data?.pending ?? "—"} icon={ShieldCheck} />
      </section>

      <section className="rounded-[24px] border border-[#153b5c] bg-[#071727] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-400" />
              <h2 className="font-display text-xl font-semibold text-white">YouTube review workspace</h2>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
              Search YouTube from the admin panel, preview the original video here, explicitly approve
              artists and creators, then keep importing songs and video podcasts from reviewed sources.
            </p>
          </div>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold text-emerald-300">
            YouTube API connected
          </span>
        </div>

        <div className="mt-4">
          <PillTabs tabs={TABS} value={tab} onChange={(next) => {
            setTab(next);
            if (next === "Artists") setSourceKind("music");
          }} />
        </div>
      </section>

      {tab === "Importer" ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_0.72fr]">
          <MusicCatalogImport presetChannelId={presetChannelId} presetKind={presetKind} />
          <section className="rounded-[24px] border border-[#153b5c] bg-[#071727] p-5">
            <h3 className="font-display text-lg font-semibold text-white">How approvals flow</h3>
            <div className="mt-4 space-y-3 text-xs leading-5 text-slate-400">
              <FlowStep n="1" text="Search and review the real YouTube artist or podcast creator." />
              <FlowStep n="2" text="Approve the source. Staff approval remains protected by MFA." />
              <FlowStep n="3" text="Use Scan again to pull eligible public, embeddable uploads without duplicates." />
              <FlowStep n="4" text="Songs and podcast episodes appear in the Nuru catalogue after the checks pass." />
            </div>
            {presetChannelId && (
              <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-cyan-300">
                  Selected source
                </p>
                <p className="mt-2 break-all text-xs font-semibold text-white">{presetChannelId}</p>
                <p className="mt-1 text-[10px] text-slate-500">
                  The importer has been prefilled with this channel.
                </p>
              </div>
            )}
          </section>
        </div>
      ) : tab === "Pending" ? (
        <section className="rounded-[24px] border border-[#153b5c] bg-[#071727] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold text-white">Pending YouTube media</h3>
              <p className="text-xs text-slate-400">
                Approval re-checks YouTube availability and the source before publishing.
              </p>
            </div>
            <GhostButton onClick={() => void pendingItems.refetch()} className="min-h-9 px-3 text-xs">
              Refresh
            </GhostButton>
          </div>
          {pendingItems.isLoading ? (
            <div className="py-10 text-center text-sm text-slate-400">Loading pending media…</div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {(pendingItems.data ?? []).map((item) => (
                <article key={item.id} className="flex gap-3 rounded-2xl border border-[#163a55] bg-[#04111f] p-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVideo({
                        videoId: item.external_id,
                        title: item.title,
                        description: "",
                        thumbnail: item.thumbnail_url ?? "",
                        channelId: item.youtube_channel_id ?? "",
                        channelName: item.creator_name ?? "",
                        publishedAt: item.created_at,
                        durationSeconds: 0,
                      });
                      setTab(item.media_type === "podcast" ? "Podcasts" : "Songs");
                    }}
                    className="h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-[#1c425f] bg-[#0a2033]"
                    aria-label={`Preview ${item.title}`}
                  >
                    {item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Youtube className="mx-auto h-5 w-5 text-slate-500" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-cyan-300">{item.media_type}</p>
                    <h4 className="mt-1 line-clamp-2 text-xs font-semibold text-white">{item.title}</h4>
                    <p className="mt-1 truncate text-[10px] text-slate-500">{item.creator_name || "YouTube"}</p>
                    <PrimaryButton
                      disabled={approvePending.isPending}
                      onClick={() => approvePending.mutate(item.id)}
                      className="mt-3 min-h-9 px-3 text-[10px]"
                    >
                      {approvePending.isPending ? "Checking…" : "Approve"}
                    </PrimaryButton>
                  </div>
                </article>
              ))}
              {!pendingItems.data?.length && (
                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.04] p-6 text-sm text-slate-400 lg:col-span-2">
                  <CheckCircle2 className="mb-2 h-5 w-5 text-emerald-300" />
                  No music or podcast videos are waiting for approval.
                </div>
              )}
            </div>
          )}
        </section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_0.82fr]">
          <section className="rounded-[24px] border border-[#153b5c] bg-[#071727] p-4">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                search.mutate();
              }}
              className="flex gap-2"
            >
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={
                    tab === "Artists"
                      ? "Search YouTube artists or creators…"
                      : tab === "Podcasts"
                        ? "Search YouTube video podcasts…"
                        : "Search YouTube songs…"
                  }
                  className="min-h-11 w-full rounded-full border border-[#1b4969] bg-[#04111f] pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
                />
              </label>
              <PrimaryButton type="submit" disabled={search.isPending} className="min-h-11 px-5">
                {search.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </PrimaryButton>
            </form>

            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setQuery(suggestion)}
                  className="rounded-full border border-[#234b68] px-3 py-1.5 text-[10px] font-semibold text-slate-400 transition hover:border-cyan-400/30 hover:text-white"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-[#163a55] bg-[#04111f] p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Or paste a YouTube link
              </p>
              <div className="flex gap-2">
                <input
                  value={paste}
                  onChange={(event) => setPaste(event.target.value)}
                  placeholder="https://youtube.com/watch?v=… or /channel/UC…"
                  className="min-h-10 min-w-0 flex-1 rounded-full border border-[#1b4969] bg-[#071727] px-4 text-xs text-white outline-none placeholder:text-slate-600"
                />
                <GhostButton
                  type="button"
                  disabled={lookup.isPending}
                  onClick={() => lookup.mutate()}
                  className="min-h-10 px-4 text-xs"
                >
                  Load
                </GhostButton>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {tab === "Artists"
                ? channelResults.map((channel) => (
                    <button
                      key={channel.channelId}
                      type="button"
                      onClick={() => {
                        setSelectedChannel(channel);
                        setSelectedVideo(null);
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl border border-[#163a55] bg-[#04111f] p-3 text-left transition hover:border-cyan-400/35"
                    >
                      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[#1c425f] bg-[#0a2033]">
                        {channel.thumbnail && <img src={channel.thumbnail} alt="" className="h-full w-full object-cover" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">{channel.title}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                          {channel.subscriberCount
                            ? Number(channel.subscriberCount).toLocaleString() + " subscribers"
                            : "YouTube channel"}
                        </span>
                      </span>
                      <span className="text-[10px] font-semibold text-cyan-300">Review →</span>
                    </button>
                  ))
                : videoResults.map((video) => (
                    <button
                      key={video.videoId}
                      type="button"
                      onClick={() => {
                        setSelectedVideo(video);
                        setSelectedChannel(null);
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl border border-[#163a55] bg-[#04111f] p-3 text-left transition hover:border-cyan-400/35"
                    >
                      <span className="h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-[#1c425f] bg-[#0a2033]">
                        {video.thumbnail && <img src={video.thumbnail} alt="" className="h-full w-full object-cover" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-xs font-semibold text-white">{video.title}</span>
                        <span className="mt-1 block truncate text-[10px] text-slate-500">{video.channelName}</span>
                      </span>
                      <span className="text-[10px] font-semibold text-cyan-300">Preview →</span>
                    </button>
                  ))}

              {!search.isPending && search.isSuccess && (
                tab === "Artists" ? channelResults.length === 0 : videoResults.length === 0
              ) && (
                <div className="rounded-2xl border border-[#163a55] bg-[#04111f] p-5 text-sm text-slate-400">
                  No matching YouTube results were returned.
                </div>
              )}
            </div>
          </section>

          <aside className="xl:sticky xl:top-24 xl:self-start">
            <section className="overflow-hidden rounded-[24px] border border-[#153b5c] bg-[#071727]">
              <div className="flex items-center gap-2 border-b border-[#153b5c] px-4 py-3">
                <Youtube className="h-4 w-4 text-red-400" />
                <h3 className="text-sm font-semibold text-white">YouTube preview</h3>
                <span className="ml-auto text-[9px] text-slate-500">Official YouTube playback</span>
              </div>

              {selectedVideo ? (
                <div className="p-4">
                  <InAppMediaPlayer
                    videoId={selectedVideo.videoId}
                    title={selectedVideo.title}
                    controls
                    interactive
                  />
                  <YouTubeNotice className="pt-2" />
                  <h4 className="mt-4 text-sm font-semibold text-white">{selectedVideo.title}</h4>
                  <p className="mt-1 text-xs text-slate-400">{selectedVideo.channelName}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <PrimaryButton
                      disabled={approveVideo.isPending}
                      onClick={() => approveVideo.mutate()}
                      className="min-h-10 px-4 text-xs"
                    >
                      {approveVideo.isPending ? "Checking…" : `Approve as ${activeVideoType === "podcast" ? "podcast" : "song"}`}
                    </PrimaryButton>
                    <a
                      href={`https://www.youtube.com/watch?v=${selectedVideo.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="nuru-soft-control inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-xs font-semibold text-foreground"
                    >
                      Open YouTube <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <p className="mt-3 text-[10px] leading-4 text-slate-500">
                    Nuru re-checks that the video is public, embeddable, available in Kenya and eligible
                    for the selected media type before approval.
                  </p>
                </div>
              ) : selectedChannel ? (
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <span className="h-16 w-16 overflow-hidden rounded-full border border-cyan-400/20 bg-[#0a2033]">
                      {selectedChannel.thumbnail && (
                        <img src={selectedChannel.thumbnail} alt="" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-base font-semibold text-white">{selectedChannel.title}</h4>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {selectedChannel.subscriberCount
                          ? Number(selectedChannel.subscriberCount).toLocaleString() + " subscribers"
                          : "YouTube channel"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 line-clamp-5 text-xs leading-5 text-slate-400">
                    {selectedChannel.description || "No channel description was returned."}
                  </p>

                  <div className="mt-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Approve source for
                    </p>
                    <PillTabs tabs={SOURCE_KINDS} value={sourceKind} onChange={setSourceKind} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <PrimaryButton
                      disabled={approveSource.isPending}
                      onClick={() => approveSource.mutate()}
                      className="min-h-10 px-4 text-xs"
                    >
                      {approveSource.isPending ? "Approving…" : "Approve source"}
                    </PrimaryButton>
                    <a
                      href={`https://www.youtube.com/channel/${selectedChannel.channelId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="nuru-soft-control inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-xs font-semibold text-foreground"
                    >
                      Open YouTube <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {presetChannelId === selectedChannel.channelId && (
                    <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3">
                      <p className="flex items-center gap-2 text-[10px] font-semibold text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approved and ready to scan
                      </p>
                      <GhostButton
                        onClick={() => setTab("Importer")}
                        className="mt-3 min-h-9 px-3 text-[10px]"
                      >
                        Open importer
                      </GhostButton>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex min-h-80 flex-col items-center justify-center p-6 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10">
                    <Youtube className="h-6 w-6 text-cyan-300" />
                  </span>
                  <p className="mt-4 text-sm font-semibold text-white">Choose a YouTube result</p>
                  <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
                    Videos will play here inside the admin panel. Channels can be reviewed and approved
                    before their catalogue is scanned.
                  </p>
                </div>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof Music2;
}) {
  return (
    <div className="rounded-[22px] border border-[#153b5c] bg-[#071727] p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[10px] text-slate-500">{label}</p>
          <p className="mt-0.5 font-display text-xl font-semibold text-white">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        </div>
      </div>
    </div>
  );
}

function FlowStep({ n, text }: { n: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-[10px] font-bold text-cyan-300">
        {n}
      </span>
      <p className="pt-1">{text}</p>
    </div>
  );
}
