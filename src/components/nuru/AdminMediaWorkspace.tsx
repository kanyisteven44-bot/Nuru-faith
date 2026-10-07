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
  Link2,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  adminYouTubeSearch,
  approveYouTubeSource,
  approveYouTubeVideo,
  resolveYouTubeCreatorLink,
  reviewMediaItem,
} from "@/lib/mediaAdmin.functions";
import { youtubeLookup } from "@/lib/youtube.functions";
import { parseYouTubeUrl } from "@/services/youtubeService";
import { InAppMediaPlayer, YouTubeNotice } from "@/components/youtube/InAppMediaPlayer";
import { MusicCatalogImport } from "@/components/youtube/MusicCatalogImport";
import { GhostButton, PillTabs, PrimaryButton } from "@/components/nuru/Primitives";
import { MfaChallenge } from "@/components/nuru/MfaSecurity";
import { getAdminFactSnapshot } from "@/lib/adminFacts.functions";
import { importReviewedCatalogPage } from "@/lib/musicCatalog.functions";

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
  const [youtubeCheck, setYoutubeCheck] = useState<"not-tested" | "working" | "error">("not-tested");
  const [quickLink, setQuickLink] = useState("");
  const [quickKind, setQuickKind] = useState<"music" | "podcast">("music");
  const [quickProgress, setQuickProgress] = useState("");
  const [quickRetryAfterMfa, setQuickRetryAfterMfa] = useState(false);
  const activeSourceChannelId = selectedChannel?.channelId ?? selectedVideo?.channelId ?? "";

  const facts = useQuery({
    queryKey: ["admin-fact-snapshot"],
    queryFn: () => getAdminFactSnapshot(),
    staleTime: 15_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const sourceStatus = useQuery({
    queryKey: ["admin-media-source-status", activeSourceChannelId],
    enabled: Boolean(activeSourceChannelId),
    queryFn: async () => {
      const result = await supabase
        .from("media_sources")
        .select("id,name,is_approved,is_verified,content_kind,updated_at")
        .eq("youtube_channel_id", activeSourceChannelId)
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    },
  });

  const videoStatus = useQuery({
    queryKey: ["admin-media-video-status", selectedVideo?.videoId],
    enabled: Boolean(selectedVideo?.videoId),
    queryFn: async () => {
      const result = await supabase
        .from("media_items")
        .select("id,title,is_approved,media_type,updated_at")
        .eq("source", "youtube")
        .eq("external_id", selectedVideo!.videoId)
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    },
  });

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
      setYoutubeCheck("working");
      setSelectedChannel(null);
      setSelectedVideo(null);
    },
    onError: (error) => {
      setYoutubeCheck("error");
      toast.error(error instanceof Error ? error.message : "YouTube search failed.");
    },
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
      setYoutubeCheck("working");
      if (parsed.kind === "channel" && "youtubeChannelId" in item) {
        setTab("Artists");
        setSelectedVideo(null);
        setSelectedChannel({
          channelId: item.youtubeChannelId,
          title: item.title,
          description: item.description ?? "",
          thumbnail: item.thumbnail ?? "",
          subscriberCount: item.subscriberCount ?? null,
        });
      } else if (parsed.kind === "video" && "youtubeVideoId" in item) {
        setSelectedChannel(null);
        setSelectedVideo({
          videoId: item.youtubeVideoId,
          title: item.title,
          description: item.description ?? "",
          thumbnail: item.thumbnail ?? "",
          channelId: item.channelId ?? "",
          channelName: item.channelName ?? "",
          publishedAt: item.publishedAt ?? "",
          durationSeconds: 0,
        });
        if (tab === "Artists" || tab === "Pending" || tab === "Importer") setTab("Songs");
      }
    },
    onError: (error) => {
      setYoutubeCheck("error");
      toast.error(error instanceof Error ? error.message : "YouTube lookup failed.");
    },
  });

  function approvalError(error: unknown) {
    const message = error instanceof Error ? error.message : "Approval failed.";
    if (/authenticator|aal2|assurance|verification/i.test(message)) setNeedsMfa(true);
    toast.error(message);
  }

  const quickApproveCreator = useMutation({
    mutationFn: async () => {
      const input = quickLink.trim();
      if (!input) throw new Error("Paste a YouTube creator, channel, @handle, or video link first.");

      setQuickProgress("Resolving the exact YouTube creator…");
      const creator = await resolveYouTubeCreatorLink({ data: { input } });
      setYoutubeCheck("working");
      setSelectedChannel(creator);
      setSelectedVideo(null);
      setSourceKind(quickKind);

      setQuickProgress(`Approving ${creator.title} as a reviewed ${quickKind === "music" ? "music" : "podcast"} source…`);
      const approved = await approveYouTubeSource({
        data: {
          channelId: creator.channelId,
          contentKind: quickKind,
          languageCodes: ["en"],
        },
      });

      let totalAdded = 0;
      let pages = 0;
      let restart = true;
      let hasMore = false;

      do {
        setQuickProgress(
          `Scanning ${creator.title} · page ${pages + 1} · ${totalAdded.toLocaleString()} new eligible ${quickKind === "music" ? "songs" : "episodes"} so far…`,
        );
        const result = await importReviewedCatalogPage({
          data: {
            kind: quickKind,
            restart,
            channelIds: [creator.channelId],
          },
        });
        restart = false;
        pages += 1;
        totalAdded += result.added;
        hasMore = Boolean(result.next);

        // A single click handles up to 5,000 uploads. Larger creator catalogues
        // keep their server checkpoint and can continue from the Importer tab.
        if (pages >= 100 && hasMore) break;
      } while (hasMore);

      return {
        creator,
        approved,
        totalAdded,
        pages,
        complete: !hasMore,
      };
    },
    onSuccess: async (result) => {
      setQuickRetryAfterMfa(false);
      setPresetChannelId(result.creator.channelId);
      setPresetKind(quickKind);
      setQuickProgress(
        result.complete
          ? `Done. ${result.creator.title} is approved and ${result.totalAdded.toLocaleString()} new eligible ${quickKind === "music" ? "songs" : "episodes"} were added without duplicates.`
          : `Creator approved. ${result.totalAdded.toLocaleString()} new eligible ${quickKind === "music" ? "songs" : "episodes"} were added in this run. The remaining catalogue is checkpointed; open Importer to continue.`,
      );
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin-media-workspace-summary"] }),
        client.invalidateQueries({ queryKey: ["admin-fact-snapshot"] }),
        client.invalidateQueries({ queryKey: ["admin-media-source-status"] }),
        client.invalidateQueries({ queryKey: ["media-sources"] }),
        client.invalidateQueries({ queryKey: ["media-catalog"] }),
      ]);
      toast.success(
        `${result.creator.title} approved · ${result.totalAdded.toLocaleString()} new eligible ${quickKind === "music" ? "songs" : "episodes"} added.`,
      );
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Creator approval failed.";
      if (/authenticator|aal2|assurance|verification/i.test(message)) {
        setNeedsMfa(true);
        setQuickRetryAfterMfa(true);
        setQuickProgress("Verify your authenticator once, then Nuru will continue this creator approval automatically.");
      } else {
        setQuickProgress(message);
      }
      toast.error(message);
    },
  });

  const approveSource = useMutation({
    mutationFn: async () => {
      if (!activeSourceChannelId) throw new Error("Choose a YouTube channel or video first.");
      const contentKind =
        selectedChannel
          ? sourceKind
          : tab === "Podcasts"
            ? "podcast"
            : "music";
      return approveYouTubeSource({
        data: {
          channelId: activeSourceChannelId,
          contentKind,
          languageCodes: ["en"],
        },
      });
    },
    onSuccess: async (result) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin-media-workspace-summary"] }),
        client.invalidateQueries({ queryKey: ["admin-fact-snapshot"] }),
        client.invalidateQueries({ queryKey: ["admin-media-source-status"] }),
        client.invalidateQueries({ queryKey: ["media-sources"] }),
      ]);
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
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin-media-workspace-summary"] }),
        client.invalidateQueries({ queryKey: ["admin-fact-snapshot"] }),
        client.invalidateQueries({ queryKey: ["admin-media-video-status"] }),
        client.invalidateQueries({ queryKey: ["media-catalog"] }),
      ]);
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
        client.invalidateQueries({ queryKey: ["admin-fact-snapshot"] }),
      ]);
      toast.success(`${result.title} approved.`);
    },
    onError: approvalError,
  });

  const channelResults = search.data?.channels ?? [];
  const videoResults = search.data?.videos ?? [];
  const factCounts = facts.data?.counts;
  const musicImport = facts.data?.imports.find((row) => row.kind === "music");
  const podcastImport = facts.data?.imports.find((row) => row.kind === "podcast");
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
            toast.success("Admin session verified.");
            if (quickRetryAfterMfa && !quickApproveCreator.isPending) {
              setQuickRetryAfterMfa(false);
              quickApproveCreator.mutate();
            }
          }}
        />
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Reviewed music sources" value={factCounts?.approvedMusicSources ?? summary.data?.musicSources ?? "—"} icon={Music2} />
        <SummaryCard label="Reviewed podcast sources" value={factCounts?.approvedPodcastSources ?? summary.data?.podcastSources ?? "—"} icon={Podcast} />
        <SummaryCard label="Approved songs" value={factCounts?.approvedMusicItems ?? summary.data?.music ?? "—"} icon={BadgeCheck} />
        <SummaryCard label="Video podcasts" value={factCounts?.approvedPodcastItems ?? summary.data?.podcasts ?? "—"} icon={Youtube} />
        <SummaryCard label="Pending review" value={factCounts?.pendingMediaItems ?? summary.data?.pending ?? "—"} icon={ShieldCheck} />
      </section>

      <section className="rounded-2xl border border-[#19364a] bg-[#071522]">
        <div className="border-b border-[#142f43] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#234a63] bg-[#0a2030] text-cyan-300">
              <Link2 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">Add a YouTube creator</h2>
              <p className="mt-1 max-w-2xl text-[11px] leading-5 text-slate-500">
                Paste the creator's channel or @handle. Nuru reviews the source first, then imports
                only eligible uploads. Existing catalogue items are skipped.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_190px_auto] xl:items-end">
          <label className="block min-w-0">
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Creator link
            </span>
            <input
              value={quickLink}
              onChange={(event) => setQuickLink(event.target.value)}
              placeholder="https://www.youtube.com/@Marionshakoke"
              className="min-h-11 w-full rounded-xl border border-[#1b4058] bg-[#04111f] px-3.5 text-xs text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Content type
            </span>
            <select
              value={quickKind}
              disabled={quickApproveCreator.isPending}
              onChange={(event) => setQuickKind(event.target.value as "music" | "podcast")}
              className="min-h-11 w-full rounded-xl border border-[#1b4058] bg-[#04111f] px-3.5 text-xs font-semibold text-white outline-none focus:border-cyan-400/50"
              aria-label="Creator content type"
            >
              <option value="music">Music / songs</option>
              <option value="podcast">Video podcasts</option>
            </select>
          </label>

          <PrimaryButton
            disabled={quickApproveCreator.isPending || !quickLink.trim()}
            onClick={() => quickApproveCreator.mutate()}
            className="min-h-11 whitespace-nowrap px-5 text-xs"
          >
            {quickApproveCreator.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : quickKind === "music" ? (
              "Approve and import"
            ) : (
              "Approve and import"
            )}
          </PrimaryButton>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#142f43] px-5 py-3">
          <p className="text-[10px] leading-4 text-slate-600">
            Accepts @handle, channel, legacy user, video and Shorts links. Admin approval remains MFA-protected.
          </p>
          <p className="text-[10px] text-slate-600">Example: youtube.com/@Marionshakoke</p>
        </div>

        {quickProgress && (
          <div className="border-t border-[#142f43] bg-[#061a28] px-5 py-3" role="status">
            <p className="text-[10px] leading-4 text-slate-300">{quickProgress}</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#19364a] bg-[#071522] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Youtube className="h-4 w-4 text-red-400" />
              <h2 className="text-sm font-semibold text-white">YouTube review workspace</h2>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
              Search, preview and review YouTube content before it enters the Nuru catalogue.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <span
              className={[
                "rounded-full border px-3 py-1 text-[10px] font-semibold",
                facts.data?.youtubeApiConfigured
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                  : facts.isLoading
                    ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                    : "border-rose-400/20 bg-rose-400/10 text-rose-300",
              ].join(" ")}
            >
              {facts.isLoading
                ? "Checking YouTube configuration…"
                : facts.data?.youtubeApiConfigured
                  ? "YouTube API key configured"
                  : "YouTube API not configured"}
            </span>
            <span
              className={[
                "rounded-full border px-3 py-1 text-[10px] font-semibold",
                youtubeCheck === "working"
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                  : youtubeCheck === "error"
                    ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
                    : "border-[#234b68] bg-[#0a2033] text-slate-400",
              ].join(" ")}
            >
              {youtubeCheck === "working"
                ? "Last YouTube request succeeded"
                : youtubeCheck === "error"
                  ? "Last YouTube request failed"
                  : "YouTube request not tested this session"}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <PillTabs tabs={TABS} value={tab} onChange={(next) => {
            setTab(next);
            if (next === "Artists") setSourceKind("music");
          }} />
        </div>
      </section>

      {tab === "Importer" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <ImportFactCard label="Music catalogue scan" row={musicImport} />
            <ImportFactCard label="Podcast catalogue scan" row={podcastImport} />
          </div>
          <div className="grid gap-4 xl:grid-cols-[1fr_0.72fr]">
          <MusicCatalogImport presetChannelId={presetChannelId} presetKind={presetKind} />
          <section className="rounded-2xl border border-[#19364a] bg-[#071522] p-5">
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
        </div>
      ) : tab === "Pending" ? (
        <section className="rounded-2xl border border-[#19364a] bg-[#071522] p-4">
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
                <article key={item.id} className="flex gap-3 rounded-xl border border-[#16364b] bg-[#04111f] p-3">
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
          <section className="rounded-2xl border border-[#19364a] bg-[#071522] p-4">
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

            <div className="mt-4 rounded-xl border border-[#16364b] bg-[#04111f] p-3">
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
                      className="flex w-full items-center gap-3 rounded-xl border border-[#16364b] bg-[#04111f] p-3 text-left transition hover:border-cyan-400/35"
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
                      className="flex w-full items-center gap-3 rounded-xl border border-[#16364b] bg-[#04111f] p-3 text-left transition hover:border-cyan-400/35"
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
                <div className="rounded-xl border border-[#16364b] bg-[#04111f] p-5 text-sm text-slate-400">
                  No matching YouTube results were returned.
                </div>
              )}
            </div>
          </section>

          <aside className="xl:sticky xl:top-24 xl:self-start">
            <section className="overflow-hidden rounded-2xl border border-[#19364a] bg-[#071522]">
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
                    <FactBadge
                      label="Creator source"
                      value={
                        sourceStatus.isLoading
                          ? "Checking…"
                          : sourceStatus.data?.is_approved && sourceStatus.data?.is_verified
                            ? "Approved + verified"
                            : sourceStatus.data
                              ? "Needs review"
                              : "Not stored"
                      }
                      good={Boolean(sourceStatus.data?.is_approved && sourceStatus.data?.is_verified)}
                    />
                    {sourceStatus.data?.content_kind && (
                      <FactBadge label="Current type" value={sourceStatus.data.content_kind} />
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {!sourceStatus.isLoading &&
                      !(sourceStatus.data?.is_approved && sourceStatus.data?.is_verified) && (
                        <PrimaryButton
                          disabled={approveSource.isPending}
                          onClick={() => approveSource.mutate()}
                          className="min-h-10 px-4 text-xs"
                        >
                          {approveSource.isPending
                            ? "Approving creator…"
                            : `Approve creator for ${activeVideoType === "podcast" ? "podcasts" : "music"}`}
                        </PrimaryButton>
                      )}
                    <PrimaryButton
                      disabled={
                        approveVideo.isPending ||
                        videoStatus.data?.is_approved === true ||
                        sourceStatus.isLoading ||
                        !(sourceStatus.data?.is_approved && sourceStatus.data?.is_verified)
                      }
                      onClick={() => approveVideo.mutate()}
                      className="min-h-10 px-4 text-xs"
                    >
                      {videoStatus.data?.is_approved
                        ? "Already approved"
                        : sourceStatus.isLoading
                          ? "Checking creator…"
                          : !(sourceStatus.data?.is_approved && sourceStatus.data?.is_verified)
                            ? "Approve creator first"
                            : approveVideo.isPending
                              ? "Checking…"
                              : `Approve as ${activeVideoType === "podcast" ? "podcast" : "song"}`}
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    <FactBadge
                      label="Video catalogue"
                      value={
                        videoStatus.isLoading
                          ? "Checking…"
                          : videoStatus.data?.is_approved
                            ? "Approved"
                            : videoStatus.data
                              ? "Pending"
                              : "Not stored"
                      }
                      good={videoStatus.data?.is_approved === true}
                    />
                    {videoStatus.data?.media_type && (
                      <FactBadge label="Stored type" value={videoStatus.data.media_type} />
                    )}
                  </div>
                  <p className="mt-3 text-[10px] leading-4 text-slate-500">
                    Nuru re-checks the current YouTube record before approval: public status,
                    embeddability, Kenya availability, source approval and media-type eligibility.
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
                      {approveSource.isPending
                        ? "Saving…"
                        : sourceStatus.data?.is_approved && sourceStatus.data?.is_verified
                          ? "Update approved source"
                          : "Approve source"}
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

function ImportFactCard({
  label,
  row,
}: {
  label: string;
  row:
    | {
        status: string;
        importedTotal: number;
        pagesProcessed: number;
        hasNextPage: boolean;
        lastError: string | null;
        updatedAt: string;
      }
    | undefined;
}) {
  return (
    <div className="rounded-xl border border-[#19364a] bg-[#071522] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-white">{label}</p>
          <p className="mt-1 text-[10px] text-slate-500">
            {row ? `Last updated ${new Date(row.updatedAt).toLocaleString()}` : "No import record"}
          </p>
        </div>
        <span
          className={[
            "rounded-full border px-2.5 py-1 text-[9px] font-semibold capitalize",
            row?.lastError
              ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
              : row?.status === "running"
                ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
                : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
          ].join(" ")}
        >
          {row?.lastError ? "attention" : row?.status ?? "unknown"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-[#163a55] bg-[#04111f] p-3">
          <p className="text-[9px] text-slate-600">Imported total</p>
          <p className="mt-1 font-display text-xl font-semibold text-white">
            {row ? row.importedTotal.toLocaleString() : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-[#163a55] bg-[#04111f] p-3">
          <p className="text-[9px] text-slate-600">Pages processed</p>
          <p className="mt-1 font-display text-xl font-semibold text-white">
            {row ? row.pagesProcessed.toLocaleString() : "—"}
          </p>
        </div>
      </div>
      {row?.lastError && <p className="mt-2 text-[10px] text-rose-300">{row.lastError}</p>}
    </div>
  );
}

function FactBadge({
  label,
  value,
  good = false,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold",
        good
          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
          : "border-[#234b68] bg-[#0a2033] text-slate-300",
      ].join(" ")}
    >
      <span className="text-slate-500">{label}:</span> {value}
    </span>
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
    <div className="rounded-xl border border-[#19364a] bg-[#071522] p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#234a63] bg-[#0a2030] text-cyan-300">
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
