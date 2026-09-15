import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen,
  CalendarPlus,
  Clapperboard,
  HandHeart,
  Link2,
  MessageSquarePlus,
  PenLine,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { createPost, createPrayerRequest, fetchProfile } from "@/services/content";
import { createReel, REEL_TOPICS, uploadReelVideo } from "@/services/reels";
import { detectReelSource, SOURCE_LABEL } from "@/lib/reelImport";
import { GradientButton, ComingSoon } from "./Primitives";

type Mode = "menu" | "post" | "prayer" | "testimony" | "reflection" | "reel";

const OPTIONS: {
  key: Mode | "event" | "discussion";
  label: string;
  hint: string;
  icon: typeof PenLine;
}[] = [
  { key: "post", label: "Post", hint: "Share something with your community", icon: PenLine },
  { key: "reel", label: "Reel", hint: "Short video teaching or testimony", icon: Clapperboard },
  { key: "prayer", label: "Prayer Request", hint: "Ask others to pray with you", icon: HandHeart },
  { key: "testimony", label: "Testimony", hint: "Tell what God has done", icon: Sparkles },
  { key: "reflection", label: "Bible Reflection", hint: "Write on a passage", icon: BookOpen },
  { key: "event", label: "Event", hint: "Church admins only", icon: CalendarPlus },
  {
    key: "discussion",
    label: "Group Discussion",
    hint: "Start a conversation in a group",
    icon: MessageSquarePlus,
  },
];

export function CreateSheet({
  open,
  onClose,
  userId,
  canPublishEvents,
}: {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  canPublishEvents: boolean;
}) {
  const [mode, setMode] = useState<Mode>("menu");
  const [body, setBody] = useState("");
  const [scripture, setScripture] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);
  const [video, setVideo] = useState<File | null>(null);
  const [reelSource, setReelSource] = useState<"upload" | "import">("upload");
  const [importUrl, setImportUrl] = useState("");
  const [topic, setTopic] = useState<string>(REEL_TOPICS[0]);
  const [bibleTeaching, setBibleTeaching] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!open) {
      setMode("menu");
      setBody("");
      setScripture("");
      setAnonymous(false);
      setVideo(null);
      setReelSource("upload");
      setImportUrl("");
      setBibleTeaching(false);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit() {
    if (!userId || body.trim().length < 3) return;
    setSaving(true);
    try {
      if (mode === "reel") {
        const detected = reelSource === "import" ? detectReelSource(importUrl) : null;
        if (reelSource === "import" && !detected) {
          throw new Error(
            "That link isn't a YouTube, TikTok or Instagram video link Nuru Faith recognizes.",
          );
        }
        const videoUrl =
          reelSource === "upload" && video ? await uploadReelVideo(userId, video) : null;
        await createReel({
          authorId: userId,
          creatorName: profile.data?.full_name ?? "Nuru member",
          creatorHandle: `@${profile.data?.username ?? "nuru"}`,
          creatorAvatarUrl: profile.data?.avatar_url ?? null,
          caption: body.trim(),
          videoUrl,
          posterUrl: detected?.posterUrl ?? null,
          scriptureRef: scripture.trim() || null,
          hashtags: Array.from(body.matchAll(/#(\w+)/g)).map((m) => m[1] as string),
          topic,
          isBibleTeaching: bibleTeaching,
          churchId: profile.data?.church_id ?? null,
          groupId: null,
          ...(detected
            ? {
                sourceType: detected.sourceType,
                rightsStatus: "external_embed",
                externalId: detected.externalId,
                externalUrl: detected.externalUrl,
              }
            : {}),
        });
        await queryClient.invalidateQueries({ queryKey: ["reels"] });
        toast.success("Reel published");
        navigate({ to: "/reels" });
      } else if (mode === "prayer") {
        await createPrayerRequest(userId, body.trim(), anonymous);
        await queryClient.invalidateQueries({ queryKey: ["prayers"] });
        toast.success("Prayer request shared");
      } else {
        await createPost({
          author_id: userId,
          kind: mode === "menu" ? "text" : mode,
          body: body.trim(),
          scripture_ref: scripture.trim() || null,
        });
        await queryClient.invalidateQueries({ queryKey: ["posts"] });
        toast.success("Shared with your community");
        navigate({ to: "/community" });
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not share that");
    } finally {
      setSaving(false);
    }
  }

  const visible = OPTIONS.filter((o) => o.key !== "event" || canPublishEvents);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Create"
    >
      <button
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative mb-0 w-full max-w-lg rounded-t-3xl border border-border bg-surface p-5 pb-8 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.8)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">
            {mode === "menu" ? "Create" : mode === "prayer" ? "Prayer request" : `New ${mode}`}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-surface-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {mode === "menu" ? (
          <ul className="space-y-2">
            {visible.map(({ key, label, hint, icon: Icon }) => {
              const buildable =
                key === "post" ||
                key === "prayer" ||
                key === "testimony" ||
                key === "reflection" ||
                key === "reel";
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => buildable && setMode(key as Mode)}
                    className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-border bg-surface-2 px-4 py-3 text-left transition-colors hover:border-border-strong hover:bg-accent disabled:opacity-60"
                    disabled={!buildable}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl nuru-gradient-bg">
                      <Icon className="h-4.5 w-4.5 text-primary-foreground" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block text-xs text-muted-foreground">{hint}</span>
                    </span>
                    {!buildable && <ComingSoon label="Soon" />}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="space-y-3">
            <label className="sr-only" htmlFor="create-body">
              Your words
            </label>
            <textarea
              id="create-body"
              autoFocus
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={1000}
              placeholder={
                mode === "prayer"
                  ? "What would you like us to pray for?"
                  : "Share what's on your heart…"
              }
              className="w-full rounded-lg border border-input bg-surface-2 p-4 text-sm outline-none placeholder:text-muted-foreground focus:border-cyan"
            />
            {(mode === "reflection" || mode === "reel") && (
              <input
                value={scripture}
                onChange={(e) => setScripture(e.target.value)}
                placeholder="Scripture reference (e.g. Matthew 5:14)"
                className="w-full rounded-2xl border border-input bg-surface-2 px-4 py-3 text-sm outline-none focus:border-primary"
              />
            )}
            {mode === "reel" && (
              <>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReelSource("upload")}
                    className={
                      reelSource === "upload"
                        ? "flex flex-1 items-center justify-center gap-1.5 rounded-full nuru-gradient-bg px-3 py-2 text-xs font-semibold text-primary-foreground"
                        : "flex flex-1 items-center justify-center gap-1.5 rounded-full bg-surface-2 px-3 py-2 text-xs text-secondary-foreground"
                    }
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload video
                  </button>
                  <button
                    type="button"
                    onClick={() => setReelSource("import")}
                    className={
                      reelSource === "import"
                        ? "flex flex-1 items-center justify-center gap-1.5 rounded-full nuru-gradient-bg px-3 py-2 text-xs font-semibold text-primary-foreground"
                        : "flex flex-1 items-center justify-center gap-1.5 rounded-full bg-surface-2 px-3 py-2 text-xs text-secondary-foreground"
                    }
                  >
                    <Link2 className="h-3.5 w-3.5" /> Import link
                  </button>
                </div>

                {reelSource === "upload" ? (
                  <>
                    <label
                      className="block text-xs font-semibold text-muted-foreground"
                      htmlFor="reel-video"
                    >
                      Video (up to about 60 seconds)
                    </label>
                    <input
                      id="reel-video"
                      type="file"
                      accept="video/*"
                      onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
                      className="w-full rounded-2xl border border-input bg-surface-2 px-4 py-3 text-xs"
                    />
                  </>
                ) : (
                  <>
                    <label
                      className="block text-xs font-semibold text-muted-foreground"
                      htmlFor="reel-import-url"
                    >
                      YouTube, TikTok or Instagram link
                    </label>
                    <input
                      id="reel-import-url"
                      type="url"
                      inputMode="url"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=… or a TikTok/Instagram link"
                      className="w-full rounded-2xl border border-input bg-surface-2 px-4 py-3 text-sm outline-none focus:border-primary"
                    />
                    {importUrl.trim() &&
                      (() => {
                        const detected = detectReelSource(importUrl);
                        return detected ? (
                          <p className="text-[11px] font-medium text-cyan">
                            Recognized as a {SOURCE_LABEL[detected.sourceType]} link — it will play
                            back through {SOURCE_LABEL[detected.sourceType]}'s own player, with a
                            link to open the original.
                          </p>
                        ) : (
                          <p className="text-[11px] text-destructive">
                            That doesn't look like a YouTube, TikTok or Instagram video link.
                          </p>
                        );
                      })()}
                    <p className="text-[11px] text-muted-foreground">
                      Nuru Faith never downloads or rehosts imported video — it stays on the
                      original platform and is always credited to its creator.
                    </p>
                  </>
                )}

                <div className="flex flex-wrap gap-2">
                  {REEL_TOPICS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTopic(t)}
                      className={
                        topic === t
                          ? "rounded-full nuru-gradient-bg px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                          : "rounded-full bg-surface-2 px-3 py-1.5 text-xs text-secondary-foreground"
                      }
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm text-secondary-foreground">
                  <input
                    type="checkbox"
                    checked={bibleTeaching}
                    onChange={(e) => setBibleTeaching(e.target.checked)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  This teaches directly from a Bible passage
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Reels are reviewed by moderators. Teaching that puts anyone at risk is removed.
                </p>
              </>
            )}
            {mode === "prayer" && (
              <label className="flex items-center gap-2 text-sm text-secondary-foreground">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                Share anonymously
              </label>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setMode("menu")}
                className="min-h-11 rounded-lg border border-border-strong px-4 text-sm text-secondary-foreground"
              >
                Back
              </button>
              <GradientButton
                className="flex-1"
                onClick={submit}
                disabled={
                  saving ||
                  body.trim().length < 3 ||
                  (mode === "reel" && reelSource === "import" && !detectReelSource(importUrl))
                }
              >
                {saving ? "Sharing…" : "Share"}
              </GradientButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
