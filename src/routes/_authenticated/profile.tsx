import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PostMedia, PostPresentation } from "@/components/nuru/PostMedia";
import { CoverImage } from "@/components/nuru/CoverImage";
import { useRef, useState } from "react";
import { profilePhotoExtension } from "@/lib/profilePhoto";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Bookmark,
  BookMarked,
  CalendarDays,
  Camera,
  ChevronRight,
  Church,
  Heart,
  Highlighter,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Settings,
  Sparkles,
  type LucideIcon,
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
import { fetchAllHighlights, fetchSavedScriptures } from "@/services/series";
import { AppShell, Avatar, ScreenHeader } from "@/components/nuru/AppShell";
import { PeopleSheet, type PeopleKind } from "@/components/nuru/PeopleSheet";
import { CardSkeleton, EmptyState, ProgressBar } from "@/components/nuru/Primitives";

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
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<GridTab>("Posts");
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [people, setPeople] = useState<PeopleKind | null>(null);

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

  const savedScriptures = useQuery({
    queryKey: ["saved-scriptures", userId],
    queryFn: () => fetchSavedScriptures(userId!),
    enabled: !!userId,
  });
  const highlights = useQuery({
    queryKey: ["all-highlights", userId],
    queryFn: () => fetchAllHighlights(userId!),
    enabled: !!userId,
  });
  const savedPostRows = useQuery({
    queryKey: ["saved-post-rows-count", userId],
    queryFn: () => fetchMySavedPostRows(userId!),
    enabled: !!userId,
  });
  const savedPostCount = savedPostRows.data?.length;

  const churchName = profile.data?.churches?.name ?? null;
  const place = profile.data?.country ?? null;

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
      kind: String(r["kind"] ?? "image"),
      musicId: r["music_track_id"] as string | undefined,
      musicStart: Number(r["music_start_seconds"] ?? 0),
    };
  });

  const selectedItem = items.find((item) => item.id === selectedPost);

  async function save() {
    if (!userId) return;
    if (!name.trim()) {
      toast.error("Enter your name before saving.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile(userId, { full_name: name.trim(), bio: bio.trim() });
      await qc.invalidateQueries({ queryKey: ["profile", userId] });
      setEditing(false);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(file: File) {
    if (!userId || uploading) return;
    setUploading(true);
    let path: string | null = null;
    let uploaded = false;
    let saved = false;
    try {
      const extension = profilePhotoExtension(file);
      path = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      uploaded = true;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await updateProfile(userId, { avatar_url: data.publicUrl });
      saved = true;
      await qc.invalidateQueries({ queryKey: ["profile", userId] });
      toast.success("Profile photo updated");
    } catch (e) {
      if (uploaded && !saved && path) await supabase.storage.from("avatars").remove([path]);
      toast.error(e instanceof Error ? e.message : "Couldn't upload your photo");
    } finally {
      setUploading(false);
      if (photoInput.current) photoInput.current.value = "";
    }
  }

  return (
    <AppShell>
      <ScreenHeader
        title="Profile"
        right={
          <Link
            to="/settings"
            aria-label="Open settings"
            className="nuru-soft-control inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-[13px] font-semibold text-secondary-foreground"
          >
            <Settings className="h-[18px] w-[18px]" />
            <span>Settings</span>
          </Link>
        }
      />

      {profile.isLoading ? (
        <div className="px-4 pt-4">
          <CardSkeleton count={3} height="h-20" />
        </div>
      ) : profile.isError || !profile.data ? (
        <div className="px-4 pt-4">
          <EmptyState
            title="Your profile could not load"
            description="Try again to load your profile."
            action={
              <button
                type="button"
                className="nuru-soft-control rounded-full px-4 py-2"
                onClick={() => void profile.refetch()}
              >
                Try again
              </button>
            }
          />
        </div>
      ) : (
        <div className="px-4 pt-1">
          {/* Identity — the board leads with the avatar and the serif name. */}
          <section className="flex gap-4">
            <span className="relative block h-[104px] w-[104px] shrink-0">
              <Avatar
                url={profile.data?.avatar_url ?? null}
                name={profile.data?.full_name ?? ""}
                seed={userId}
                size="lg"
                className="h-[104px] w-[104px] text-3xl"
              />
              <button
                type="button"
                onClick={() => photoInput.current?.click()}
                disabled={uploading}
                aria-label="Change your photo"
                className="nuru-disc absolute right-0 bottom-0 h-8 w-8 ring-4 ring-[var(--background)]"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" strokeWidth={1.9} />
                )}
              </button>
              <input
                ref={photoInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                aria-label="Choose profile photo"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadPhoto(file);
                }}
              />
            </span>

            <div className="min-w-0 flex-1 pt-1">
              <h1 className="flex items-center gap-1.5 font-display text-[26px] leading-tight">
                <span className="truncate">{profile.data?.full_name ?? "Nuru member"}</span>
                {profile.data?.verified && (
                  <BadgeCheck className="h-5 w-5 shrink-0 text-leaf" aria-label="Verified" />
                )}
              </h1>
              <p className="truncate text-[13px] text-ink-3">
                @{profile.data?.username ?? "member"}
              </p>
              {churchName && (
                <p className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-2">
                  <Church className="h-3.5 w-3.5 shrink-0 text-ink-3" strokeWidth={1.9} />
                  <span className="truncate">{churchName}</span>
                </p>
              )}
              {place && (
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-3" strokeWidth={1.9} />
                  <span className="truncate">{place}</span>
                </p>
              )}
            </div>
          </section>

          {/* Three-up counts, as the board has them. */}
          <dl className="mt-5 grid grid-cols-3">
            <Stat label="Posts" value={counts.data?.posts} />
            <Stat
              label="Followers"
              value={counts.data?.followers}
              onOpen={() => setPeople("followers")}
            />
            <Stat
              label="Following"
              value={counts.data?.following}
              onOpen={() => setPeople("following")}
            />
          </dl>

          {/* My faith journey */}
          <section className="nuru-card mt-5 p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-[21px] leading-none">My faith journey</h2>
              <button
                type="button"
                onClick={() => {
                  setName(profile.data?.full_name ?? "");
                  setBio(profile.data?.bio ?? "");
                  setEditing((v) => !v);
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border-strong bg-[linear-gradient(180deg,#143254,#0C2440)] px-3 py-1.5 text-[12px] font-bold text-ink-2"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2.1} />
                {editing ? "Cancel" : "Edit"}
              </button>
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
              {profile.data?.bio || "Say a little about your faith journey."}
            </p>
            <div className="mt-3.5 flex items-center gap-3">
              <span className="nuru-disc h-9 w-9">
                <Sparkles className="h-4 w-4" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold">Growing Disciple</span>
                <span className="block text-[11px] text-ink-3">
                  Level {level} · {LEVEL_STEP - intoLevel} to next level
                </span>
              </span>
            </div>
            <ProgressBar value={(intoLevel / LEVEL_STEP) * 100} className="mt-2.5" />
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
                className="w-full resize-none rounded-xl border border-input bg-surface-2 px-4 py-3 text-sm outline-none placeholder:text-ink-3 focus:border-leaf"
              />
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="nuru-raise flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,var(--forest-hi),var(--primary))] text-sm font-bold text-foreground disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
            </section>
          )}

          {/* Saved content — real counts only; there is no Downloads feature
              in the app, so the board's Downloads row is left out. */}
          <div className="mt-6 mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-[21px] leading-none">Saved content</h2>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <SavedTile
              icon={BookMarked}
              label="Bible verses"
              count={savedScriptures.data?.length}
              to="/bible"
            />
            <SavedTile
              icon={Highlighter}
              label="Highlights"
              count={highlights.data?.length}
              to="/bible"
            />
            <SavedTile icon={Bookmark} label="Saved posts" count={savedPostCount} to="/community" />
          </div>

          <Link to="/events" className="nuru-card mt-3 flex items-center gap-3 p-3">
            <span className="nuru-disc nuru-disc-terra h-9 w-9">
              <CalendarDays className="h-4 w-4" strokeWidth={1.9} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold">Events</span>
              <span className="block text-[11px] text-ink-3">
                {myEvents.data ? `${myEvents.data.length} booked` : "— booked"}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={2} />
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
                  tab === t ? "border-leaf text-leaf" : "border-transparent text-muted-foreground",
                )}
              >
                {t}
              </button>
            ))}
            <Link
              to="/create"
              aria-label="Create post"
              className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-full bg-primary/15 px-3 text-xs font-semibold text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Post
            </Link>
          </div>

          <section className="pt-3">
            {active.isLoading && <CardSkeleton count={2} height="h-28" />}
            {active.isError && (
              <EmptyState
                title={`Couldn't load your ${tab.toLowerCase()}`}
                description="Check your connection and try again."
                action={
                  <button
                    type="button"
                    className="nuru-soft-control rounded-full px-4 py-2"
                    onClick={() => void active.refetch()}
                  >
                    Try again
                  </button>
                }
              />
            )}
            {!active.isLoading && !active.isError && items.length === 0 && (
              <EmptyState
                title={`No ${tab.toLowerCase()} yet`}
                action={
                  tab === "Posts" ? (
                    <Link
                      to="/create"
                      className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary/15 px-3 text-xs font-semibold text-primary"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create post
                    </Link>
                  ) : undefined
                }
                description={
                  tab === "Saved"
                    ? "Posts you save will collect here."
                    : "What you share will show up here."
                }
              />
            )}
            {items.length > 0 && (
              <ul className="grid grid-cols-3 gap-2">
                {tab === "Posts" && (
                  <li>
                    <Link
                      to="/create"
                      className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 text-primary"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                        <Plus className="h-4 w-4" />
                      </span>
                      <span className="text-xs font-semibold">New post</span>
                    </Link>
                  </li>
                )}
                {items.map((item) => (
                  <li key={item.id} className="relative">
                    <button
                      type="button"
                      onClick={() => setSelectedPost(item.id)}
                      aria-label={item.title || "Open post"}
                      className="relative block aspect-[3/4] w-full overflow-hidden rounded-xl border border-border text-left"
                    >
                      {item.cover ? (
                        <PostMedia url={item.cover} kind={item.kind} compact />
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
                          <Heart className="h-3 w-3 fill-current text-terra-lt" />
                          {compactCount(item.likes)}
                        </span>
                      </span>
                    </button>
                    {tab === "Posts" && (
                      <Link
                        to="/create"
                        aria-label="Create another post"
                        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => {
          if (!open) setSelectedPost(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl">
          <DialogTitle>Post</DialogTitle>
          <DialogDescription>{selectedItem?.title || "Shared media"}</DialogDescription>
          {selectedItem && (
            <PostPresentation
              url={selectedItem.cover}
              kind={selectedItem.kind}
              musicId={selectedItem.musicId ?? null}
              start={selectedItem.musicStart}
            />
          )}
        </DialogContent>
      </Dialog>
      {people && userId && (
        <PeopleSheet
          kind={people}
          userId={userId}
          viewerId={userId}
          onClose={() => setPeople(null)}
        />
      )}
    </AppShell>
  );
}

/** One of the board's saved-content tiles. The count is a real count. */
function SavedTile({
  icon: Icon,
  label,
  count,
  to,
}: {
  icon: LucideIcon;
  label: string;
  count: number | undefined;
  to: "/bible" | "/community";
}) {
  return (
    <Link to={to} className="nuru-card flex flex-col gap-2 p-3">
      <span className="nuru-disc h-9 w-9">
        <Icon className="h-4 w-4" strokeWidth={1.9} />
      </span>
      <span className="block text-[12px] leading-tight font-bold">{label}</span>
      <span className="block text-[11px] text-ink-3">
        {count == null ? "—" : `${count} item${count === 1 ? "" : "s"}`}
      </span>
    </Link>
  );
}

function Stat({
  label,
  value,
  onOpen,
}: {
  label: string;
  value: number | undefined;
  /** When given, the whole stat becomes a button that opens its list. */
  onOpen?: () => void;
}) {
  const body = (
    <>
      <span className="block font-display text-[19px] font-bold">
        {value == null ? "—" : compactCount(value)}
      </span>
      <span
        className={cn(
          "block text-[11px]",
          onOpen ? "text-secondary-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </>
  );

  return (
    <div className="px-1 text-center">
      <dt className="sr-only">{label}</dt>
      <dd>
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label={`See ${label.toLowerCase()}`}
            className="w-full rounded-lg py-0.5 transition-colors active:bg-surface-2"
          >
            {body}
          </button>
        ) : (
          body
        )}
      </dd>
    </div>
  );
}
