import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  BookMarked,
  ChevronRight,
  Flame,
  HandHeart,
  Heart,
  Loader2,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resolveMedia } from "@/lib/media";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchMyEventIds,
  fetchMyGroupIds,
  fetchMyPosts,
  fetchMySavedPostRows,
  fetchProfile,
  fetchProfileCounts,
  updateProfile,
} from "@/services/content";
import { fetchMyReels } from "@/services/reels";
import { AppShell, Avatar, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, ProgressBar } from "@/components/nuru/Primitives";
import coverArt from "@/assets/cross-sunrise.jpg";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Nuru Faith" },
      { name: "description", content: "Your Nuru Faith profile, badges and saved content." },
    ],
  }),
  component: ProfileScreen,
});

/** Faith-journey levels. Progress is driven by the profile's faith_streak. */
const LEVEL_STEP = 250;

const BADGES = [
  {
    icon: HandHeart,
    label: "Prayer Life",
    tint: "text-rose-300 bg-rose-500/15 border-rose-400/30",
  },
  {
    icon: Heart,
    label: "Kindness",
    tint: "text-emerald-300 bg-emerald-500/15 border-emerald-400/30",
  },
  { icon: Users, label: "Community", tint: "text-cyan bg-primary/15 border-primary/30" },
  {
    icon: Flame,
    label: "Bible Streak",
    tint: "text-amber-300 bg-amber-500/15 border-amber-400/30",
  },
] as const;

const GRID_TABS = ["Posts", "Reels", "Saved"] as const;
type GridTab = (typeof GRID_TABS)[number];

/** 1200 -> "1.2K", so a long count never pushes the stats row out of shape. */
function compactCount(value: number) {
  if (value < 1000) return String(value);
  const thousands = value / 1000;
  return `${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, "")}K`;
}

function ProfileScreen() {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<GridTab>("Posts");

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  const counts = useQuery({
    queryKey: ["profile-counts", userId],
    queryFn: () => fetchProfileCounts(userId!),
    enabled: !!userId,
  });
  const myGroups = useQuery({
    queryKey: ["my-group-ids", userId],
    queryFn: () => fetchMyGroupIds(userId!),
    enabled: !!userId,
  });
  const myEvents = useQuery({
    queryKey: ["my-events", userId],
    queryFn: () => fetchMyEventIds(userId!),
    enabled: !!userId,
  });
  const myPosts = useQuery({
    queryKey: ["my-posts", userId],
    queryFn: () => fetchMyPosts(userId!),
    enabled: !!userId && tab === "Posts",
  });
  const myReels = useQuery({
    queryKey: ["my-reels", userId],
    queryFn: () => fetchMyReels(userId!),
    enabled: !!userId && tab === "Reels",
  });
  const savedPosts = useQuery({
    queryKey: ["saved-post-rows", userId],
    queryFn: () => fetchMySavedPostRows(userId!),
    enabled: !!userId && tab === "Saved",
  });

  const streak = profile.data?.faith_streak ?? 0;
  const level = Math.floor(streak / LEVEL_STEP) + 1;
  const intoLevel = streak % LEVEL_STEP;

  const active = tab === "Posts" ? myPosts : tab === "Reels" ? myReels : savedPosts;
  const items = (active.data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r["id"]),
      title: String(r["caption"] ?? r["body"] ?? ""),
      cover: (r["poster_url"] ?? r["media_url"] ?? null) as string | null,
      likes: Number(r["like_count"] ?? 0),
    };
  });

  async function save() {
    if (!userId) return;
    setSaving(true);
    try {
      await updateProfile(userId, { full_name: name, bio });
      await qc.invalidateQueries({ queryKey: ["profile", userId] });
      setEditing(false);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    void navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  return (
    <AppShell>
      <ScreenHeader
        title="Profile"
        right={
          <Link to="/settings" aria-label="Settings" className="p-1 text-secondary-foreground">
            <Settings className="h-5 w-5" />
          </Link>
        }
      />

      {profile.isLoading ? (
        <div className="px-4 pt-4">
          <CardSkeleton count={3} height="h-20" />
        </div>
      ) : (
        <div className="px-4 pt-1">
          {/* Cover, avatar and identity */}
          <section className="nuru-card overflow-hidden">
            <div className="relative h-28">
              <img src={coverArt} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/25 to-transparent" />
              <p className="script absolute top-3 right-4 text-right text-[19px] leading-[1.15] text-white/90">
                Faith
                <span className="block">Purpose</span>
                <span className="block">Impact</span>
              </p>
            </div>

            <div className="relative px-4 pb-4">
              {/* The avatar lifts into the cover; the identity column sits
                  beside it, as the design lays it out. */}
              <div className="flex gap-3">
                <Avatar
                  url={profile.data?.avatar_url ?? null}
                  name={profile.data?.full_name ?? ""}
                  seed={userId}
                  size="lg"
                  className="-mt-11 shrink-0 ring-4 ring-card"
                />
                <div className="min-w-0 flex-1 pt-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h1 className="flex items-center gap-1.5 font-display text-[19px] leading-tight font-bold">
                        <span>{profile.data?.full_name ?? "Nuru member"}</span>
                        {profile.data?.verified && (
                          <BadgeCheck
                            className="h-4.5 w-4.5 shrink-0 text-cyan"
                            aria-label="Verified"
                          />
                        )}
                      </h1>
                      <p className="truncate text-[13px] text-muted-foreground">
                        @{profile.data?.username ?? "member"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setName(profile.data?.full_name ?? "");
                        setBio(profile.data?.bio ?? "");
                        setEditing((v) => !v);
                      }}
                      className="shrink-0 rounded-xl border border-border-strong bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-secondary-foreground"
                    >
                      {editing ? "Cancel" : "Edit profile"}
                    </button>
                  </div>
                  {profile.data?.bio && (
                    <p className="mt-1.5 text-[13px] text-secondary-foreground">
                      {profile.data.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {editing && (
            <section className="nuru-card mt-3 space-y-2 p-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                aria-label="Full name"
                placeholder="Full name"
                className="input-nuru"
              />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={280}
                rows={3}
                aria-label="Bio"
                placeholder="Say a little about your faith journey"
                className="w-full resize-none rounded-xl border border-input bg-surface-2 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
              />
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
            </section>
          )}

          {/* Stats */}
          <dl className="nuru-card mt-3 grid grid-cols-4 divide-x divide-border py-3">
            <Stat label="Posts" value={counts.data?.posts} />
            <Stat label="Followers" value={counts.data?.followers} />
            <Stat label="Following" value={counts.data?.following} />
            <Stat label="Groups" value={(myGroups.data ?? []).length} />
          </dl>

          <Link to="/groups" className="nuru-card mt-3 flex items-center gap-3 px-4 py-3.5">
            <Users className="h-4.5 w-4.5 shrink-0 text-cyan" strokeWidth={1.8} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">My Groups</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>

          {/* Grid tabs */}
          <div className="mt-6 flex gap-5 border-b border-border">
            {GRID_TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-current={tab === t ? "true" : undefined}
                className={cn(
                  "-mb-px border-b-2 pb-2.5 text-[14px] font-semibold transition-colors",
                  tab === t ? "border-cyan text-cyan" : "border-transparent text-muted-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <section className="pt-3">
            {active.isLoading && <CardSkeleton count={2} height="h-28" />}
            {!active.isLoading && items.length === 0 && (
              <EmptyState
                title={`No ${tab.toLowerCase()} yet`}
                description={
                  tab === "Saved"
                    ? "Posts you save will collect here."
                    : "What you share will show up here."
                }
              />
            )}
            {items.length > 0 && (
              <ul className="grid grid-cols-3 gap-2">
                {items.map((item) => (
                  <li key={item.id}>
                    <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border">
                      {item.cover ? (
                        <img
                          src={resolveMedia(item.cover)}
                          alt=""
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <span className="absolute inset-0 bg-gradient-to-br from-surface-2 to-card" />
                      )}
                      <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                      <span className="absolute inset-x-0 bottom-0 p-2">
                        {item.title && (
                          <span className="line-clamp-2 block text-[12px] leading-tight font-semibold text-white">
                            {item.title}
                          </span>
                        )}
                        <span className="mt-1 flex items-center gap-1 text-[11px] text-white/85">
                          <Heart className="h-3 w-3 fill-current text-rose-400" />
                          {compactCount(item.likes)}
                        </span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Faith journey */}
          <section className="nuru-card mt-6 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-primary/12 text-cyan">
                <Sparkles className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Growing Disciple</p>
                <p className="text-[11px] text-muted-foreground">
                  Level {level} · {LEVEL_STEP - intoLevel} to next level
                </p>
              </div>
            </div>
            <ProgressBar value={(intoLevel / LEVEL_STEP) * 100} className="mt-3" />
          </section>

          <section className="pt-6">
            <h2 className="mb-3 font-display text-[15px] font-semibold">My Badges</h2>
            <div className="grid grid-cols-4 gap-x-2 gap-y-3">
              {BADGES.map(({ icon: Icon, label, tint }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                  <span
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-2xl border",
                      tint,
                    )}
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.8} />
                  </span>
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </section>

          <Link to="/bible" className="nuru-card mt-6 flex items-center gap-3 px-4 py-3.5">
            <BookMarked className="h-4.5 w-4.5 shrink-0 text-cyan" strokeWidth={1.8} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">Saved Scripture</span>
          </Link>

          <p className="pt-3 text-center text-[11px] text-muted-foreground">
            {(myEvents.data ?? []).length} event
            {(myEvents.data ?? []).length === 1 ? "" : "s"} on your calendar
          </p>

          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-4 min-h-12 w-full rounded-xl border border-destructive/40 bg-destructive/10 text-sm font-semibold text-destructive"
          >
            Log Out
          </button>
        </div>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="px-1 text-center">
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="block font-display text-[19px] font-bold">
          {value == null ? "—" : compactCount(value)}
        </span>
        <span className="block text-[11px] text-muted-foreground">{label}</span>
      </dd>
    </div>
  );
}
