import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Music2, Search, Video, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { createPost, fetchMyGroupIds, fetchGroups, fetchProfile } from "@/services/content";
import { supabase } from "@/integrations/supabase/client";
import { POST_MUSIC, POST_MUSIC_BY_ID } from "@/lib/postMusic";
import { PostSoundtrack, PostPresentation } from "@/components/nuru/PostMedia";
import { AppShell, Avatar } from "@/components/nuru/AppShell";

const createSearchSchema = z.object({
  group: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/create")({
  validateSearch: createSearchSchema,
  head: () => ({
    meta: [
      { title: "Create post — Nuru Faith" },
      {
        name: "description",
        content: "Share a testimony, reflection or prayer with your community.",
      },
    ],
  }),
  component: CreateScreen,
});

/** Where the post goes. "Public" is the whole community; the others scope it. */
const AUDIENCES = ["Public", "My Group"] as const;
type Audience = (typeof AUDIENCES)[number];

function CreateScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { userId } = useAuth();
  const search = Route.useSearch();
  const [step, setStep] = useState<"edit" | "review">("edit");
  const [body, setBody] = useState("");
  const [scripture, setScripture] = useState("");
  const [audience, setAudience] = useState<Audience>(search.group ? "My Group" : "Public");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<{ file: File; url: string } | null>(null);
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicQuery, setMusicQuery] = useState("");
  const [musicId, setMusicId] = useState<string | null>(null);
  const [musicStart, setMusicStart] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(search.group ?? null);
  useEffect(
    () => () => {
      if (media) URL.revokeObjectURL(media.url);
    },
    [media],
  );
  const track = musicId ? POST_MUSIC_BY_ID.get(musicId) : null;
  const matchingMusic = POST_MUSIC.filter((t) =>
    `${t.title} ${t.artist} ${t.mood}`.toLowerCase().includes(musicQuery.trim().toLowerCase()),
  );

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  const groups = useQuery({ queryKey: ["groups"], queryFn: () => fetchGroups() });
  const myGroupIds = useQuery({
    queryKey: ["my-group-ids", userId],
    queryFn: () => fetchMyGroupIds(userId!),
    enabled: !!userId,
  });

  const myGroups = (groups.data ?? []).filter((g) => (myGroupIds.data ?? []).includes(g.id));
  const mentorGroupId = selectedGroup ?? myGroups[0]?.id ?? null;

  async function publish() {
    if (!userId) {
      toast.error("Sign in to post");
      return;
    }
    const text = body.trim();
    if (!text && !media) {
      toast.error("Add a photo, video or caption first");
      return;
    }
    if (audience === "My Group" && !mentorGroupId) {
      toast.error("Join a group before posting to one");
      return;
    }
    setBusy(true);
    let path: string | null = null;
    let published = false;
    try {
      if (media) {
        const extensions: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "image/gif": "gif",
          "video/mp4": "mp4",
          "video/webm": "webm",
          "video/quicktime": "mov",
        };
        const ext = extensions[media.file.type];
        if (!ext) throw new Error("Choose JPG, PNG, WebP, GIF, MP4, WebM or MOV.");
        if (media.file.size > 50 * 1024 * 1024)
          throw new Error("Choose a file smaller than 50 MB.");
        path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("post-media")
          .upload(path, media.file, { contentType: media.file.type, upsert: false });
        if (error) throw new Error("Couldn't upload your media. Please retry.");
      }

      await createPost({
        author_id: userId,
        kind: media ? (media.file.type.startsWith("image/") ? "image" : "video") : "text",
        body: text,
        media_url: path ? `post:${path}` : null,
        music_track_id: musicId,
        music_start_seconds: musicStart,
        scripture_ref: scripture.trim() || null,
        group_id: audience === "My Group" ? mentorGroupId : null,
      });
      published = true;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["posts"] }),
        qc.invalidateQueries({ queryKey: ["my-posts", userId] }),
        qc.invalidateQueries({ queryKey: ["profile-counts", userId] }),
      ]);
      toast.success(audience === "My Group" ? "Shared with your group" : "Posted");
      if (audience === "My Group" && mentorGroupId) {
        void navigate({ to: "/groups", search: { group: mentorGroupId } });
      } else {
        void navigate({ to: "/community" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't publish that");
    } finally {
      if (path && !published) await supabase.storage.from("post-media").remove([path]);
      setBusy(false);
    }
  }

  return (
    <AppShell hideNav>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-background/90 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <button
          type="button"
          onClick={() =>
            void navigate(
              search.group
                ? { to: "/groups", search: { group: search.group } }
                : { to: "/community" },
            )
          }
          aria-label="Cancel"
          disabled={busy}
          className="-ml-1 rounded-full p-1.5 text-secondary-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <h1 className="font-display text-[17px] font-semibold">
          {step === "edit" ? "New post" : "Ready to share"}
        </h1>
        <button
          type="button"
          onClick={() => {
            if (step === "edit") setStep("review");
            else void publish();
          }}
          disabled={busy || (!body.trim() && !media)}
          className="rounded-lg bg-primary px-4 py-1.5 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Sharing…" : step === "edit" ? "Next" : "Share"}
        </button>
      </header>

      {step === "review" ? (
        <div className="space-y-4 px-4 py-5">
          <PostPresentation
            url={media?.url ?? null}
            kind={media?.file.type.startsWith("image/") ? "image" : "video"}
            musicId={musicId}
            start={musicStart}
          />
          <p className="whitespace-pre-wrap text-sm">{body}</p>
          {scripture && <p className="text-xs text-primary">{scripture}</p>}
          <p className="text-xs text-muted-foreground">
            Sharing with{" "}
            {audience === "Public"
              ? "the community"
              : myGroups.find((g) => g.id === mentorGroupId)?.name || "your group"}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => setStep("edit")}
            className="min-h-10 rounded-full border border-border px-4 text-sm"
          >
            Back to editing
          </button>
        </div>
      ) : (
        <div className="px-4 pt-2">
          <div className="flex items-center gap-3">
            <Avatar
              url={profile.data?.avatar_url ?? null}
              name={profile.data?.full_name ?? ""}
              seed={userId}
            />
            <span>
              <span className="block text-sm font-semibold">
                {profile.data?.full_name ?? "Nuru member"}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                @{profile.data?.username ?? "you"}
              </span>
            </span>
          </div>

          {!media && (
            <button
              type="button"
              onClick={() => {
                if (fileInput.current) {
                  fileInput.current.accept =
                    "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";
                  fileInput.current.click();
                }
              }}
              className="mt-5 flex min-h-40 w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-primary/35 bg-primary/5"
            >
              <ImageIcon className="h-9 w-9 text-primary" />
              <strong className="text-sm">Choose a photo or video</strong>
              <span className="text-xs text-muted-foreground">
                Add music and a caption before sharing
              </span>
            </button>
          )}
          {media && (
            <div className="relative mt-4 rounded-2xl border border-border p-2">
              {media.file.type.startsWith("image/") ? (
                <img
                  src={media.url}
                  alt="Post preview"
                  className="max-h-[55dvh] w-full rounded-xl object-contain"
                />
              ) : (
                <video
                  src={media.url}
                  controls
                  playsInline
                  className="max-h-[55dvh] w-full rounded-xl"
                />
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => setMedia(null)}
                aria-label="Remove attachment"
                className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            aria-label="Post caption"
            placeholder="Write a caption…"
            className="mt-4 w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground"
          />

          <input
            value={scripture}
            onChange={(e) => setScripture(e.target.value)}
            maxLength={60}
            aria-label="Scripture reference (optional)"
            placeholder="Add a Scripture reference (optional)"
            className="input-nuru mt-2"
          />

          <input
            ref={fileInput}
            type="file"
            className="sr-only"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (file.size > 50 * 1024 * 1024) {
                toast.error("Choose a file smaller than 50 MB.");
                return;
              }
              setMedia({ file, url: URL.createObjectURL(file) });
            }}
          />
          <div className="grid grid-cols-3 gap-3 pt-5">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (fileInput.current) {
                  fileInput.current.accept = "image/jpeg,image/png,image/webp,image/gif";
                  fileInput.current.click();
                }
              }}
              className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface-2 text-sm"
            >
              <ImageIcon className="h-6 w-6 text-primary" />
              Photo
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (fileInput.current) {
                  fileInput.current.accept = "video/mp4,video/webm,video/quicktime";
                  fileInput.current.click();
                }
              }}
              className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface-2 text-sm"
            >
              <Video className="h-6 w-6 text-primary" />
              Video
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setMusicOpen((v) => !v)}
              aria-expanded={musicOpen}
              className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface-2 text-sm"
            >
              <Music2 className="h-6 w-6 text-primary" />
              Music
            </button>
          </div>
          {track && (
            <div className="mt-4">
              <PostSoundtrack key={musicId} id={track.id} start={musicStart} />
              <label className="mt-3 block text-xs">
                Start at {musicStart}s
                <input
                  type="range"
                  min={0}
                  max={Math.min(600, Math.max(0, track.duration - 5))}
                  value={musicStart}
                  onChange={(e) => setMusicStart(Number(e.target.value))}
                  className="mt-2 w-full"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setMusicId(null);
                  setMusicStart(0);
                }}
                className="mt-2 text-xs text-muted-foreground"
              >
                Remove music
              </button>
            </div>
          )}
          {musicOpen && (
            <section className="mt-4 rounded-2xl border border-border bg-card p-3">
              <label className="flex items-center gap-2 rounded-xl bg-surface-2 px-3">
                <Search className="h-4 w-4" />
                <input
                  value={musicQuery}
                  onChange={(e) => setMusicQuery(e.target.value)}
                  placeholder="Search songs, moods or artist"
                  aria-label="Search music"
                  className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </label>
              <p className="my-2 text-xs text-muted-foreground">
                {POST_MUSIC.length} tracks · Kevin MacLeod · CC BY 4.0
              </p>
              <div className="max-h-72 space-y-1 overflow-auto">
                {matchingMusic.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setMusicId(t.id);
                      setMusicStart(0);
                      setMusicOpen(false);
                    }}
                    className={cn(
                      "flex min-h-16 w-full items-center gap-3 rounded-xl px-3 py-2 text-left",
                      musicId === t.id ? "bg-primary/15" : "hover:bg-surface-2",
                    )}
                  >
                    <Music2 className="h-5 w-5 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm">{t.title}</strong>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t.artist} · {t.mood}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {Math.floor(t.duration / 60)}:{String(t.duration % 60).padStart(2, "0")}
                    </span>
                  </button>
                ))}
                {!matchingMusic.length && (
                  <p className="p-3 text-sm text-muted-foreground">
                    No matching track. Try another song or mood.
                  </p>
                )}
              </div>
            </section>
          )}

          <div className="pt-6 pb-8">
            {audience === "My Group" && (
              <>
                {search.group && (
                  <p className="mb-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                    You opened the composer from a group. This post will stay scoped to that group unless you choose Public.
                  </p>
                )}
                <select
                aria-label="Choose group"
                value={mentorGroupId ?? ""}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="input-nuru mb-3"
              >
                {myGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              </>
            )}
            <h2 className="mb-2 font-display text-[15px] font-semibold">Add to</h2>
            <div className="space-y-2">
              {AUDIENCES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAudience(a)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
                    audience === a
                      ? "border-primary/60 bg-primary/12 text-foreground"
                      : "border-border bg-surface-2/60 text-secondary-foreground",
                  )}
                >
                  {a}
                  <span
                    className={cn(
                      "h-4 w-4 rounded-full border",
                      audience === a ? "border-leaf bg-leaf" : "border-border-strong",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
