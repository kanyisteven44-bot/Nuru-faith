import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bell,
  BookMarked,
  Church,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { INTERESTS } from "@/constants/nuru";
import { cn } from "@/lib/utils";
import {
  fetchInterests,
  fetchMyGroupIds,
  fetchMyProgress,
  fetchMyRoles,
  fetchProfile,
  saveInterests,
  updateProfile,
} from "@/services/content";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { Avatar } from "@/components/nuru/PostCard";
import {
  CardSkeleton,
  Chip,
  GhostButton,
  GradientButton,
  IconTile,
  SectionHeader,
} from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Nuru Faith" },
      {
        name: "description",
        content: "Your faith journey, saved content, groups and church on Nuru Faith.",
      },
      { property: "og:title", content: "Your profile — Nuru Faith" },
      { property: "og:description", content: "Your faith journey on Nuru Faith." },
    ],
  }),
  component: ProfileScreen,
});

function ProfileScreen() {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  const myInterests = useQuery({
    queryKey: ["interests", userId],
    queryFn: () => fetchInterests(userId!),
    enabled: !!userId,
  });
  const progress = useQuery({
    queryKey: ["progress", userId],
    queryFn: () => fetchMyProgress(userId!),
    enabled: !!userId,
  });
  const groups = useQuery({
    queryKey: ["my-groups", userId],
    queryFn: () => fetchMyGroupIds(userId!),
    enabled: !!userId,
  });
  const roles = useQuery({
    queryKey: ["roles", userId],
    queryFn: () => fetchMyRoles(userId!),
    enabled: !!userId,
  });

  useEffect(() => {
    if (profile.data) {
      setFullName(profile.data.full_name ?? "");
      setBio(profile.data.bio ?? "");
    }
  }, [profile.data]);
  useEffect(() => {
    if (myInterests.data) setInterests(myInterests.data);
  }, [myInterests.data]);

  const isAdmin = (roles.data ?? []).some(
    (r) => r.role === "church_admin" || r.role === "super_admin",
  );

  async function save() {
    if (!userId) return;
    setSaving(true);
    try {
      await updateProfile(userId, { full_name: fullName.trim() || null, bio: bio.trim() || null });
      await saveInterests(userId, interests);
      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      await queryClient.invalidateQueries({ queryKey: ["interests", userId] });
      setEditing(false);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "login" as const }, replace: true });
  }

  if (profile.isLoading) {
    return (
      <AppShell>
        <div className="p-4">
          <CardSkeleton count={4} height="h-24" />
        </div>
      </AppShell>
    );
  }

  const p = profile.data;

  return (
    <AppShell>
      <ScreenHeader
        title="Profile"
        right={
          <Link
            to="/notifications"
            aria-label="Notifications"
            className="rounded-full p-2.5 hover:bg-surface-2"
          >
            <Bell className="h-5 w-5" />
          </Link>
        }
      />

      <section className="flex items-center gap-4 px-4 py-5">
        <Avatar src={p?.avatar_url} name={p?.full_name} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-lg font-semibold">
            {p?.full_name ?? "Nuru member"}
          </h2>
          {p?.username && <p className="text-xs text-muted-foreground">@{p.username}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip tone="growth">{p?.faith_streak ?? 0} day streak</Chip>
            {p?.denomination && <Chip>{p.denomination}</Chip>}
            {p?.country && <Chip>{p.country}</Chip>}
          </div>
        </div>
      </section>

      {p?.bio && !editing && <p className="px-4 pb-4 text-sm text-secondary-foreground">{p.bio}</p>}

      <div className="px-4">
        <JourneyStrip streak={p?.faith_streak ?? 0} />
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 pt-4">
        <Stat label="Groups" value={groups.data?.length ?? 0} icon={UsersRound} />
        <Stat label="Courses" value={progress.data?.length ?? 0} icon={GraduationCap} />
        <Stat label="Saved" value={0} icon={BookMarked} />
      </div>

      <div className="flex gap-2 px-4 pt-4">
        {editing ? (
          <>
            <GhostButton onClick={() => setEditing(false)}>Cancel</GhostButton>
            <GradientButton className="flex-1" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </GradientButton>
          </>
        ) : (
          <GhostButton className="flex-1" onClick={() => setEditing(true)}>
            Edit profile
          </GhostButton>
        )}
      </div>

      {editing && (
        <section className="space-y-3 px-4 pt-4">
          <div>
            <label
              htmlFor="pf-name"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Full name
            </label>
            <input
              id="pf-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              className="input-nuru"
            />
          </div>
          <div>
            <label
              htmlFor="pf-bio"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Bio
            </label>
            <textarea
              id="pf-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={280}
              className="w-full rounded-2xl border border-input bg-surface-2 p-4 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Interests</p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => {
                const on = interests.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setInterests((prev) => (on ? prev.filter((x) => x !== i) : [...prev, i]))
                    }
                    className={cn(
                      "min-h-10 rounded-full border px-3.5 text-xs",
                      on
                        ? "border-transparent nuru-gradient-bg font-semibold text-primary-foreground"
                        : "border-border bg-surface-2 text-secondary-foreground",
                    )}
                  >
                    {i}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="px-4 pt-6">
        <SectionHeader title="Your journey" />
        <div className="space-y-2">
          <RowLink
            to="/church"
            icon={Church}
            label="My Church"
            hint={p?.churches?.name ?? "Join a church community"}
          />
          <RowLink to="/mentors" icon={Sparkles} label="Mentorship" hint="Requests and mentors" />
          <RowLink to="/learn" icon={GraduationCap} label="Learning" hint="Courses in progress" />
          <RowLink
            to="/hub"
            icon={BookMarked}
            label="Nuru Faith Hub"
            hint="Everything in one place"
          />
          {isAdmin && (
            <RowLink
              to="/admin"
              icon={LayoutDashboard}
              label="Church admin"
              hint="Manage your community"
            />
          )}
        </div>
      </section>

      <div className="px-4 py-8">
        <button
          onClick={signOut}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-destructive/40 text-sm font-medium text-destructive"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </AppShell>
  );
}

const JOURNEY = ["Explorer", "Growing Disciple", "Active Member", "Kingdom Impact"] as const;

function JourneyStrip({ streak }: { streak: number }) {
  const stage = streak >= 90 ? 3 : streak >= 30 ? 2 : streak >= 7 ? 1 : 0;
  return (
    <div className="nuru-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan/80">
          Faith journey
        </p>
        <p className="text-xs font-semibold text-foreground">{JOURNEY[stage]}</p>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {JOURNEY.map((label, i) => (
          <div key={label} className="flex-1">
            <div
              className={cn(
                "h-1.5 rounded-full transition-colors",
                i <= stage ? "bg-gradient-to-r from-cyan to-primary" : "bg-surface-2",
              )}
            />
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {stage < 3
          ? `Keep showing up — you're growing toward ${JOURNEY[stage + 1]}.`
          : "You're living it out. Keep leading the way."}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof UsersRound;
}) {
  return (
    <div className="nuru-card flex flex-col items-center gap-1 p-3">
      <Icon className="h-4 w-4 text-cyan" />
      <span className="font-display text-lg font-semibold">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

function RowLink({
  to,
  icon: Icon,
  label,
  hint,
}: {
  to: string;
  icon: typeof Church;
  label: string;
  hint: string;
}) {
  return (
    <Link to={to} className="nuru-card flex min-h-16 items-center gap-3 p-3.5">
      <IconTile icon={Icon} tone="brand" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
    </Link>
  );
}
