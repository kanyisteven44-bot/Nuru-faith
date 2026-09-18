import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookMarked,
  Bookmark,
  CalendarCheck,
  ChevronRight,
  CircleHelp,
  Flame,
  HandHeart,
  Heart,
  Loader2,
  Settings,
  Sparkles,
  SquarePen,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchMyEventIds,
  fetchMyGroupIds,
  fetchMySavedPosts,
  fetchProfile,
  fetchProfileCounts,
  updateProfile,
} from "@/services/content";
import { AppShell, Avatar, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, ProgressBar } from "@/components/nuru/Primitives";

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
  { icon: Users, label: "Community", tint: "text-sky-300 bg-sky-500/15 border-sky-400/30" },
  {
    icon: Flame,
    label: "Bible Streak",
    tint: "text-amber-300 bg-amber-500/15 border-amber-400/30",
  },
] as const;

/** Compact "128 / Posts" pair for the profile header. */
function Count({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="text-center">
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="block font-display text-[17px] font-bold">
          {value == null ? "—" : compactCount(value)}
        </span>
        <span className="block text-[11px] text-muted-foreground">{label}</span>
      </dd>
    </div>
  );
}

/** 1200 -> "1.2K", so long counts never push the row out of shape. */
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

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  const saved = useQuery({
    queryKey: ["saved-posts", userId],
    queryFn: () => fetchMySavedPosts(userId!),
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
  const counts = useQuery({
    queryKey: ["profile-counts", userId],
    queryFn: () => fetchProfileCounts(userId!),
    enabled: !!userId,
  });

  const streak = profile.data?.faith_streak ?? 0;
  const level = Math.floor(streak / LEVEL_STEP) + 1;
  const intoLevel = streak % LEVEL_STEP;

  async function save() {
    if (!userId) return;
    setSaving(true);
    try {
      await updateProfile(userId, { full_name: name.trim() || null, bio: bio.trim() || null });
      await qc.invalidateQueries({ queryKey: ["profile", userId] });
      setEditing(false);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save your profile");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", search: { mode: "login" as const }, replace: true });
  }

  const MENU = [
    { icon: SquarePen, label: "My Posts", count: null, to: "/community" as const },
    { icon: Bookmark, label: "Saved", count: (saved.data ?? []).length, to: "/community" as const },
    {
      icon: Users,
      label: "My Groups",
      count: (myGroups.data ?? []).length,
      to: "/groups" as const,
    },
    {
      icon: CalendarCheck,
      label: "My Events",
      count: (myEvents.data ?? []).length,
      to: "/events" as const,
    },
    { icon: Settings, label: "Settings", count: null, to: "/settings" as const },
    { icon: CircleHelp, label: "Help & Support", count: null, to: "/settings" as const },
  ];

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
        <div className="px-4 pt-2">
          <section className="flex flex-col items-center text-center">
            <Avatar
              url={profile.data?.avatar_url ?? null}
              name={profile.data?.full_name ?? ""}
              seed={userId}
              size="lg"
            />
            <h1 className="mt-3 font-display text-xl font-semibold">
              {profile.data?.full_name ?? "Nuru member"}
            </h1>
            <p className="text-[12px] text-muted-foreground">
              @{profile.data?.username ?? "member"}
            </p>
            {profile.data?.bio && (
              <p className="mt-2 max-w-xs text-[13px] text-secondary-foreground">
                {profile.data.bio}
              </p>
            )}

            <dl className="mt-4 flex items-start gap-8">
              <Count label="Posts" value={counts.data?.posts} />
              <Count label="Followers" value={counts.data?.followers} />
              <Count label="Following" value={counts.data?.following} />
            </dl>

            <button
              type="button"
              onClick={() => {
                setName(profile.data?.full_name ?? "");
                setBio(profile.data?.bio ?? "");
                setEditing((v) => !v);
              }}
              className="mt-3 rounded-lg border border-border-strong bg-surface-2 px-4 py-1.5 text-[12px] font-semibold text-secondary-foreground"
            >
              {editing ? "Cancel" : "Edit profile"}
            </button>
          </section>

          {editing && (
            <section className="nuru-card mt-4 space-y-2 p-4">
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

          <section className="nuru-card mt-5 p-4">
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

          <section className="space-y-2 pt-6">
            {MENU.map(({ icon: Icon, label, count, to }) => (
              <Link key={label} to={to} className="nuru-card flex items-center gap-3 px-4 py-3.5">
                <Icon className="h-4.5 w-4.5 shrink-0 text-cyan" strokeWidth={1.8} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
                {count !== null && count > 0 && (
                  <span className="shrink-0 text-[12px] text-muted-foreground">{count}</span>
                )}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
            <Link to="/bible" className="nuru-card flex items-center gap-3 px-4 py-3.5">
              <BookMarked className="h-4.5 w-4.5 shrink-0 text-cyan" strokeWidth={1.8} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">Saved Scripture</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </section>

          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-6 min-h-12 w-full rounded-xl border border-destructive/40 bg-destructive/10 text-sm font-semibold text-destructive"
          >
            Log Out
          </button>
        </div>
      )}
    </AppShell>
  );
}
