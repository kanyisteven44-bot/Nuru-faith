import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  Loader2,
  Play,
  UsersRound,
  Video,
} from "lucide-react";
import { AppShell } from "@/components/nuru/AppShell";
import { CoverImage } from "@/components/nuru/CoverImage";
import { fetchYouTubeReelDetails } from "@/lib/youtubeReel.functions";
import { compactNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/creator/$videoId")({
  validateSearch: (
    value: Record<string, unknown>,
  ): { from?: "music" | "reels" | undefined } => ({
    from: value["from"] === "music" || value["from"] === "reels" ? value["from"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Creator — Nuru Faith" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CreatorProfilePage,
});

function CreatorProfilePage() {
  const { videoId } = Route.useParams();
  const { from = "reels" } = Route.useSearch();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const profile = useInfiniteQuery({
    queryKey: ["youtube-creator-profile", videoId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      fetchYouTubeReelDetails({
        data: {
          videoId,
          section: "channel",
          ...(pageParam ? { pageToken: pageParam } : {}),
        },
      }),
    getNextPageParam: (page) => page.nextPageToken ?? undefined,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const first = profile.data?.pages[0];
  const uploads = useMemo(
    () =>
      Array.from(
        new Map(
          (profile.data?.pages ?? [])
            .flatMap((page) => page.uploads)
            .map((video) => [video.id, video] as const),
        ).values(),
      ),
    [profile.data],
  );

  const creator = first?.creator;
  const description = creator?.description?.trim() ?? "";
  const shouldClamp = description.length > 420;
  const visibleDescription =
    shouldClamp && !expanded ? description.slice(0, 420).trimEnd() + "…" : description;

  function openVideo(id: string) {
    if (from === "music") {
      void navigate({ to: "/music", search: { video: id } });
      return;
    }
    void navigate({ to: "/reels", search: { youtube: id } });
  }

  return (
    <AppShell>
      <div className="min-h-dvh bg-[#F4F7FB] pb-28 text-[#172033]">
        <header className="sticky top-0 z-40 border-b border-[#DDE5EF]/90 bg-[#F4F7FB]/95 backdrop-blur-xl">
          <div className="mx-auto flex min-h-16 max-w-4xl items-center gap-3 px-4">
            <Link
              to={from === "music" ? "/music" : "/reels"}
              search={{}}
              aria-label={from === "music" ? "Back to Music" : "Back to Reels"}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white bg-white shadow-sm"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6D7C91]">
                Creator
              </p>
              <h1 className="truncate font-display text-lg font-semibold">
                {creator?.name ?? "Creator profile"}
              </h1>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
          {profile.isPending && (
            <div className="flex min-h-[55dvh] items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
                <p className="mt-3 text-sm text-[#6D7C91]">Loading creator…</p>
              </div>
            </div>
          )}

          {profile.isError && (
            <section className="rounded-[28px] border border-[#DCE4EE] bg-white p-6 text-center shadow-sm">
              <UsersRound className="mx-auto h-10 w-10 text-[#8290A4]" />
              <h2 className="mt-4 font-display text-xl font-semibold">Creator profile unavailable</h2>
              <p className="mt-2 text-sm leading-6 text-[#6D7C91]">
                Nuru could not load this creator right now. Please try again.
              </p>
              <button
                type="button"
                onClick={() => void profile.refetch()}
                className="mt-5 rounded-full bg-[#2E79D3] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Try again
              </button>
            </section>
          )}

          {creator && (
            <>
              <section className="overflow-hidden rounded-[30px] border border-[#DCE4EE] bg-white shadow-[0_18px_45px_rgba(48,66,91,0.10)]">
                <div className="h-28 bg-[radial-gradient(circle_at_20%_20%,rgba(57,189,248,0.32),transparent_34%),radial-gradient(circle_at_82%_10%,rgba(102,126,234,0.20),transparent_36%),linear-gradient(135deg,#071A2A,#102F4B)]" />
                <div className="-mt-12 px-5 pb-6 sm:px-7">
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="h-24 w-24 overflow-hidden rounded-[26px] border-4 border-white bg-[#EAF1F8] shadow-lg">
                      {creator.avatar ? (
                        <CoverImage
                          src={creator.avatar}
                          alt=""
                          width={160}
                          height={160}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <UsersRound className="h-9 w-9 text-[#7890A8]" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="min-w-0 truncate font-display text-2xl font-semibold sm:text-3xl">
                          {creator.name}
                        </h2>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF4FF] px-2.5 py-1 text-[10px] font-bold text-[#2E79D3]">
                          <BadgeCheck className="h-3.5 w-3.5" />
                          Approved on Nuru
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6D7C91]">
                        {creator.subscribers !== null && (
                          <span>{compactNumber(Number(creator.subscribers))} subscribers</span>
                        )}
                        <span>{uploads.length.toLocaleString()} videos loaded</span>
                      </div>
                    </div>
                  </div>

                  {description && (
                    <div className="mt-5 rounded-2xl bg-[#F6F8FB] p-4">
                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#4E5C70]">
                        {visibleDescription}
                      </p>
                      {shouldClamp && (
                        <button
                          type="button"
                          onClick={() => setExpanded((value) => !value)}
                          className="mt-2 text-xs font-bold text-[#2E79D3]"
                        >
                          {expanded ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    <a
                      href={`https://www.youtube.com/channel/${creator.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#D8E1EC] bg-white px-4 text-sm font-semibold text-[#27364A]"
                    >
                      View original channel
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <span className="inline-flex min-h-11 items-center rounded-full bg-[#EEF5FC] px-4 text-xs font-semibold text-[#5F7188]">
                      Videos open in {from === "music" ? "Music" : "Reels"}
                    </span>
                  </div>
                </div>
              </section>

              <section className="mt-7">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7A8799]">
                      Discover
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold">Latest videos</h2>
                  </div>
                  <span className="text-xs text-[#8A97A8]">{uploads.length} loaded</span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {uploads.map((video) => (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() => openVideo(video.id)}
                      className="group overflow-hidden rounded-[22px] border border-[#DCE4EE] bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <span className="relative block overflow-hidden bg-[#EAF0F6]">
                        {video.thumbnail ? (
                          <CoverImage
                            src={video.thumbnail}
                            alt=""
                            width={480}
                            height={270}
                            loading="lazy"
                            className="aspect-video w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <span className="flex aspect-video items-center justify-center">
                            <Video className="h-6 w-6 text-[#8A97A8]" />
                          </span>
                        )}
                        <span className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/75 text-white shadow">
                          <Play className="h-4 w-4 fill-current" />
                        </span>
                      </span>
                      <span className="block p-3">
                        <span className="line-clamp-2 text-sm font-semibold leading-snug text-[#172033]">
                          {video.title}
                        </span>
                        <span className="mt-1 block text-[10px] font-medium text-[#2E79D3]">
                          Open in {from === "music" ? "Music" : "Reels"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>

                {profile.hasNextPage && (
                  <button
                    type="button"
                    disabled={profile.isFetchingNextPage}
                    onClick={() => void profile.fetchNextPage()}
                    className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#D8E1EC] bg-white text-sm font-semibold text-[#334257]"
                  >
                    {profile.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
                    {profile.isFetchingNextPage ? "Loading more…" : "Load more videos"}
                  </button>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </AppShell>
  );
}
