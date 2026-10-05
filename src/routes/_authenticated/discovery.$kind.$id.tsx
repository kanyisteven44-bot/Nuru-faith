import { CoverImage } from "@/components/nuru/CoverImage";
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Church, Clapperboard, FileText, MapPin, MessageCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { DISCOVERY_KINDS, DISCOVERY_LABELS } from "@/lib/content-policy";
import { searchDiscovery } from "@/lib/discovery.functions";
import { fetchMyPosts, fetchProfile, fetchProfileCounts } from "@/services/content";
import { fetchFollowingIds, fetchMyReels, toggleFollow } from "@/services/reels";
import { AppShell, Avatar, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/nuru/Primitives";
import { ScriptureText } from "@/components/nuru/Scripture";
import { YouTubePlayer } from "@/components/youtube/YouTubePlayer";
import { resolveMedia } from "@/lib/media";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/discovery/$kind/$id")({
  component: DiscoveryDetail,
});

function DiscoveryDetail() {
  const params = Route.useParams();

  if (params.kind === "profile") {
    return <PublicProfileDetail id={params.id} />;
  }

  return <ContentDetail kindParam={params.kind} id={params.id} />;
}

function ContentDetail({ kindParam, id }: { kindParam: string; id: string }) {
  const { userId } = useAuth();
  const kind = DISCOVERY_KINDS.find((value) => value === kindParam);
  const result = useQuery({
    queryKey: ["discovery-item", userId, kind, id],
    enabled: !!kind && !!userId,
    queryFn: () => searchDiscovery({ data: { kind: kind!, id } }),
  });
  const item = result.data?.items[0];

  return (
    <AppShell>
      <ScreenHeader title={kind ? DISCOVERY_LABELS[kind] : "Explore"} />
      <div className="space-y-4 p-4">
        <Link
          to="/explore"
          search={{ q: "", kind: "all" }}
          className="inline-flex min-h-11 items-center text-sm text-leaf"
        >
          Back to Explore
        </Link>
        {result.isLoading && <CardSkeleton count={1} height="h-48" />}
        {result.isError && <ErrorState onRetry={() => void result.refetch()} />}
        {(!kind || (result.isSuccess && !item)) && (
          <EmptyState
            title="Content unavailable"
            description="It may have been removed or may no longer be shared with you."
          />
        )}
        {item && (
          <article className="nuru-card space-y-4 overflow-hidden p-4">
            <h1 className="font-display text-xl font-semibold break-words">{item.title}</h1>
            {item.image && (
              <CoverImage
                src={resolveMedia(item.image)}
                alt=""
                className="max-h-64 w-full rounded-xl object-cover"
              />
            )}
            <p className="whitespace-pre-wrap break-words text-sm text-secondary-foreground">
              {item.description}
            </p>
            {item.reference && <ScriptureText reference={item.reference} />}
            {item.kind === "churches" && item.sourceUrl && (
              <div className="space-y-2">
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center rounded-full border border-primary/40 px-5 text-sm font-semibold text-primary"
                >
                  View church on map
                </a>
                <p className="text-xs text-muted-foreground">
                  Map data © OpenStreetMap contributors, licensed under{" "}
                  <a
                    href="https://opendatacommons.org/licenses/odbl/1-0/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    ODbL
                  </a>
                  . Confirm details with the church before visiting.
                </p>
              </div>
            )}
            {item.source === "youtube" && item.externalId && (
              <YouTubePlayer videoId={item.externalId} title={item.title} />
            )}
            {item.source !== "youtube" && item.audioUrl && (
              <audio controls preload="none" src={resolveMedia(item.audioUrl)} className="w-full" />
            )}
            {item.kind === "series" && item.slug && (
              <Link
                className="inline-flex min-h-11 items-center text-leaf"
                to="/series/$slug"
                params={{ slug: item.slug }}
              >
                Begin this series
              </Link>
            )}
            {item.kind === "reels" && (
              <a
                className="inline-flex min-h-11 items-center text-leaf"
                href={`/reels?reel=${item.id}`}
              >
                Watch this Reel
              </a>
            )}
          </article>
        )}
      </div>
    </AppShell>
  );
}

function PublicProfileDetail({ id }: { id: string }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"Reels" | "Posts">("Reels");

  const profile = useQuery({
    queryKey: ["public-profile", id],
    queryFn: () => fetchProfile(id),
    enabled: !!id,
  });
  const counts = useQuery({
    queryKey: ["profile-counts", id],
    queryFn: () => fetchProfileCounts(id),
    enabled: !!id,
  });
  const reels = useQuery({
    queryKey: ["public-profile-reels", id],
    queryFn: () => fetchMyReels(id),
    enabled: !!id && tab === "Reels",
  });
  const posts = useQuery({
    queryKey: ["public-profile-posts", id],
    queryFn: () => fetchMyPosts(id),
    enabled: !!id && tab === "Posts",
  });
  const following = useQuery({
    queryKey: ["my-following-ids", userId],
    queryFn: () => fetchFollowingIds(userId!),
    enabled: !!userId && userId !== id,
  });

  const isSelf = userId === id;
  const isFollowing = (following.data ?? []).includes(id);

  const follow = useMutation({
    mutationFn: () => toggleFollow(userId!, id, isFollowing),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["my-following-ids", userId] }),
        qc.invalidateQueries({ queryKey: ["profile-counts", id] }),
        qc.invalidateQueries({ queryKey: ["profile-counts", userId] }),
        qc.invalidateQueries({ queryKey: ["following", userId] }),
      ]);
    },
    onError: () => toast.error("Couldn't update that — try again"),
  });

  if (profile.isLoading) {
    return (
      <AppShell>
        <ScreenHeader title="Profile" back />
        <div className="px-4 pt-4">
          <CardSkeleton count={3} height="h-20" />
        </div>
      </AppShell>
    );
  }

  if (!profile.data) {
    return (
      <AppShell>
        <ScreenHeader title="Profile" back />
        <div className="px-4 pt-8">
          <EmptyState
            title="Profile unavailable"
            description="This member may no longer be available on Nuru Faith."
          />
        </div>
      </AppShell>
    );
  }

  const p = profile.data;
  const name = p.full_name?.trim() || p.username?.trim() || "Nuru member";

  return (
    <AppShell>
      <ScreenHeader title={p.username ? `@${p.username}` : "Profile"} back />
      <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-2">
        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="h-24 bg-[linear-gradient(135deg,rgba(67,131,220,0.24),rgba(238,181,106,0.22),rgba(20,42,69,0.12))]" />
          <div className="-mt-12 px-5 pb-5">
            <Avatar
              url={p.avatar_url ?? null}
              name={name}
              seed={id}
              size="lg"
              className="h-24 w-24 border-4 border-card text-2xl shadow-lg"
            />

            <div className="mt-3">
              <h1 className="flex items-center gap-1.5 font-display text-[26px] font-bold leading-tight">
                <span className="truncate">{name}</span>
                {p.verified && (
                  <BadgeCheck aria-label="Verified" className="h-5 w-5 shrink-0 text-primary" />
                )}
              </h1>
              {p.username && (
                <p className="mt-0.5 truncate text-[13px] text-muted-foreground">@{p.username}</p>
              )}
              {p.bio && (
                <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-secondary-foreground">
                  {p.bio}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                {p.churches?.name && (
                  <span className="inline-flex items-center gap-1.5">
                    <Church className="h-3.5 w-3.5 text-primary" />
                    {p.churches.name}
                  </span>
                )}
                {p.country && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {p.country}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 border-y border-border/70 py-4 text-center">
              <ProfileStat label="Posts" value={counts.data?.posts ?? 0} />
              <ProfileStat label="Followers" value={counts.data?.followers ?? 0} />
              <ProfileStat label="Following" value={counts.data?.following ?? 0} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {isSelf ? (
                <Link
                  to="/settings/profile"
                  className="col-span-2 flex min-h-11 items-center justify-center rounded-xl border border-border-strong bg-surface-2 text-sm font-semibold"
                >
                  Edit profile
                </Link>
              ) : userId ? (
                <>
                  <button
                    type="button"
                    disabled={follow.isPending}
                    onClick={() => follow.mutate()}
                    className={cn(
                      "flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60",
                      isFollowing
                        ? "border border-border-strong bg-surface-2 text-secondary-foreground"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    {!isFollowing && <UserPlus className="h-4 w-4" />}
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                  <Link
                    to="/messages"
                    search={{ user: id }}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface-2 text-sm font-semibold"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Message
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-4">
          <div className="grid grid-cols-2 border-b border-border" role="tablist" aria-label="Profile content">
            {(["Reels", "Posts"] as const).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tab === item}
                onClick={() => setTab(item)}
                className={cn(
                  "flex min-h-12 items-center justify-center gap-2 border-b-2 text-sm font-semibold",
                  tab === item
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground",
                )}
              >
                {item === "Reels" ? <Clapperboard className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                {item}
              </button>
            ))}
          </div>

          {tab === "Reels" && (
            <div className="pt-3">
              {reels.isLoading ? (
                <CardSkeleton count={3} height="h-40" />
              ) : (reels.data ?? []).length ? (
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {(reels.data ?? []).map((reel) => (
                    <Link
                      key={reel.id}
                      to="/reels"
                      search={{ reel: reel.id }}
                      className="relative aspect-[9/14] overflow-hidden rounded-xl bg-surface-2"
                      aria-label={`Open Reel by ${name}`}
                    >
                      {reel.poster_url ? (
                        <CoverImage
                          src={resolveMedia(reel.poster_url)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-end bg-gradient-to-b from-surface-2 to-background p-2">
                          <span className="line-clamp-3 text-[11px] font-semibold">
                            {reel.caption || reel.title || "Nuru Reel"}
                          </span>
                        </div>
                      )}
                      <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">
                        Reel
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No Reels yet"
                  description={isSelf ? "Your public Reels will appear here." : "This member has not posted a Reel yet."}
                />
              )}
            </div>
          )}

          {tab === "Posts" && (
            <div className="space-y-2 pt-3">
              {posts.isLoading ? (
                <CardSkeleton count={3} height="h-28" />
              ) : (posts.data ?? []).length ? (
                (posts.data ?? []).map((post) => (
                  <article key={post.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                    {post.media_url && (
                      <CoverImage
                        src={resolveMedia(post.media_url)}
                        alt=""
                        className="max-h-80 w-full object-cover"
                      />
                    )}
                    <div className="p-4">
                      {post.body && (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-secondary-foreground">
                          {post.body}
                        </p>
                      )}
                      {post.scripture_ref && (
                        <p className="mt-2 text-xs font-semibold text-primary">{post.scripture_ref}</p>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState
                  title="No posts yet"
                  description={isSelf ? "Your public posts will appear here." : "This member has not posted anything yet."}
                />
              )}
            </div>
          )}
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Public profile</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            Only community-facing information appears here. Private messages, mentorship
            conversations, account details and prayer-journal entries are never shown.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

function ProfileStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-display text-lg font-semibold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
