import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Image as ImageIcon, Radio, Video, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { createPost, fetchMyGroupIds, fetchGroups, fetchProfile } from "@/services/content";
import { AppShell, Avatar } from "@/components/nuru/AppShell";

export const Route = createFileRoute("/_authenticated/create")({
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
const AUDIENCES = ["Public", "My Church", "Mentor Group"] as const;
type Audience = (typeof AUDIENCES)[number];

const ATTACHMENTS = [
  {
    label: "Photo",
    icon: ImageIcon,
    tint: "text-emerald-300 bg-emerald-500/15 border-emerald-400/30",
  },
  { label: "Video", icon: Video, tint: "text-violet-300 bg-violet-500/15 border-violet-400/30" },
  { label: "Live", icon: Radio, tint: "text-rose-300 bg-rose-500/15 border-rose-400/30" },
  { label: "Poll", icon: BarChart3, tint: "text-amber-300 bg-amber-500/15 border-amber-400/30" },
] as const;

function CreateScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { userId } = useAuth();
  const [body, setBody] = useState("");
  const [scripture, setScripture] = useState("");
  const [audience, setAudience] = useState<Audience>("Public");
  const [busy, setBusy] = useState(false);

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

  /** Mentor Group posts land in the first group the person actually belongs to. */
  const mentorGroupId =
    (groups.data ?? []).find((g) => (myGroupIds.data ?? []).includes(g.id))?.id ?? null;

  async function publish() {
    if (!userId) {
      toast.error("Sign in to post");
      return;
    }
    const text = body.trim();
    if (!text) {
      toast.error("Write something first");
      return;
    }
    if (audience === "Mentor Group" && !mentorGroupId) {
      toast.error("Join a group before posting to one");
      return;
    }
    setBusy(true);
    try {
      await createPost({
        author_id: userId,
        kind: "text",
        body: text,
        scripture_ref: scripture.trim() || null,
        group_id: audience === "Mentor Group" ? mentorGroupId : null,
      });
      await qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Posted");
      void navigate({ to: "/community" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't publish that");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell hideNav>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-background/90 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => void navigate({ to: "/community" })}
          aria-label="Cancel"
          className="-ml-1 rounded-full p-1.5 text-secondary-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <h1 className="font-display text-[17px] font-semibold">Create Post</h1>
        <button
          type="button"
          onClick={() => void publish()}
          disabled={busy || !body.trim()}
          className="rounded-lg bg-primary px-4 py-1.5 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          Post
        </button>
      </header>

      <div className="px-4 pt-2">
        <div className="flex items-center gap-3">
          <Avatar url={profile.data?.avatar_url ?? null} name={profile.data?.full_name ?? ""} />
          <span>
            <span className="block text-sm font-semibold">
              {profile.data?.full_name ?? "Nuru member"}
            </span>
            <span className="block text-[11px] text-muted-foreground">
              @{profile.data?.username ?? "you"}
            </span>
          </span>
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          maxLength={2000}
          aria-label="What's on your heart today?"
          placeholder="What's on your heart today?"
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

        <div className="grid grid-cols-4 gap-2 pt-5">
          {ATTACHMENTS.map(({ label, icon: Icon, tint }) => (
            <button
              key={label}
              type="button"
              onClick={() => toast(`${label} uploads aren't switched on yet.`)}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className={cn("flex h-12 w-12 items-center justify-center rounded-xl border", tint)}
              >
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </button>
          ))}
        </div>

        <div className="pt-6">
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
                    audience === a ? "border-cyan bg-cyan" : "border-border-strong",
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
