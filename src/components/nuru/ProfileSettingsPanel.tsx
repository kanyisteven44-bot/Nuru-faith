import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  AtSign,
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  UserRound,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState } from "@/components/nuru/Primitives";
import { useAuth } from "@/hooks/useAuth";
import { profilePhotoExtension } from "@/lib/profilePhoto";
import { supabase } from "@/integrations/supabase/client";
import {
  checkUsernameAvailability,
  fetchProfile,
  updateProfile,
} from "@/services/content";

const USERNAME_RE = /^[a-z0-9._]{3,30}$/;

function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export function ProfileSettingsPanel({ onBack }: { onBack: () => void }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const photoInput = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!profile.data || hydrated) return;
    setDisplayName(profile.data.full_name ?? "");
    setUsername(profile.data.username ?? "");
    setBio(profile.data.bio ?? "");
    setCountry(profile.data.country ?? "");
    setHydrated(true);
  }, [profile.data, hydrated]);

  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);
  const currentUsername = profile.data?.username ?? "";
  const usernameChanged = normalizedUsername !== currentUsername;
  const usernameValid = !normalizedUsername || USERNAME_RE.test(normalizedUsername);

  const availability = useQuery({
    queryKey: ["username-availability", normalizedUsername, userId],
    queryFn: () => checkUsernameAvailability(normalizedUsername, userId!),
    enabled: !!userId && !!normalizedUsername && usernameValid && usernameChanged,
    staleTime: 15_000,
  });

  const usernameAvailable =
    !normalizedUsername ||
    !usernameChanged ||
    (availability.isSuccess && availability.data === true);

  async function refreshProfile() {
    if (!userId) return;
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["profile", userId] }),
      qc.invalidateQueries({ queryKey: ["public-profile", userId] }),
      qc.invalidateQueries({ queryKey: ["discovery"] }),
    ]);
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
      await refreshProfile();
      toast.success("Profile photo updated");
    } catch (error) {
      if (uploaded && !saved && path) await supabase.storage.from("avatars").remove([path]);
      toast.error(error instanceof Error ? error.message : "Couldn't upload your photo");
    } finally {
      setUploading(false);
      if (photoInput.current) photoInput.current.value = "";
    }
  }

  async function save() {
    if (!userId || saving) return;
    const name = displayName.trim();

    if (!name) {
      toast.error("Add your display name before saving.");
      return;
    }
    if (!usernameValid) {
      toast.error("Usernames use 3–30 lowercase letters, numbers, dots or underscores.");
      return;
    }
    if (normalizedUsername && !usernameAvailable) {
      toast.error("That username is already taken.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile(userId, {
        full_name: name,
        username: normalizedUsername || null,
        bio: bio.trim() || null,
        country: country.trim() || null,
      });
      setUsername(normalizedUsername);
      await refreshProfile();
      toast.success("Profile saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Couldn't save your profile";
      toast.error(/duplicate|unique|username/i.test(message) ? "That username is already taken." : message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-10">
      <header className="flex min-h-16 items-center gap-3 border-b border-border/60">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Settings"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 font-display text-[22px] font-semibold">Edit Profile</h1>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || availability.isFetching}
          className="min-h-10 rounded-full px-3 text-[13px] font-bold text-primary disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </header>

      {profile.isLoading ? (
        <div className="pt-5">
          <CardSkeleton count={4} height="h-16" />
        </div>
      ) : profile.isError || !profile.data ? (
        <div className="pt-5">
          <EmptyState
            title="Profile settings could not load"
            description="Try again to load your profile settings."
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
        <>
          <section className="flex flex-col items-center pt-7">
            <span className="relative">
              <Avatar
                url={profile.data.avatar_url ?? null}
                name={profile.data.full_name ?? ""}
                seed={userId}
                size="lg"
                className="h-28 w-28 text-3xl ring-4 ring-card"
              />
              <button
                type="button"
                onClick={() => photoInput.current?.click()}
                disabled={uploading}
                aria-label="Change profile photo"
                className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-background"
              >
                {uploading ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <Camera className="h-4.5 w-4.5" />
                )}
              </button>
            </span>
            <button
              type="button"
              onClick={() => photoInput.current?.click()}
              disabled={uploading}
              className="mt-3 min-h-10 px-3 text-sm font-semibold text-primary"
            >
              Change photo
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
          </section>

          {!currentUsername && (
            <section className="mt-3 rounded-2xl border border-primary/25 bg-primary/8 p-4">
              <div className="flex gap-3">
                <AtSign className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Choose a username</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    A username makes it much easier for people to search for you, open your profile,
                    mention you and start a conversation.
                  </p>
                </div>
              </div>
            </section>
          )}

          <div className="mt-6 space-y-5">
            <Field label="Username" icon={AtSign}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value.replace(/^@+/, ""))}
                  maxLength={30}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="your.username"
                  className="input-nuru pl-7 pr-10"
                  aria-describedby="username-help"
                />
                {!!normalizedUsername && usernameValid && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {availability.isFetching ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : usernameAvailable ? (
                      <CheckCircle2 className="h-4 w-4 text-growth" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </span>
                )}
              </div>
              <p id="username-help" className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                {normalizedUsername && !usernameValid
                  ? "Use 3–30 lowercase letters, numbers, dots or underscores."
                  : normalizedUsername && usernameChanged && availability.data === false
                    ? "That username is already taken."
                    : normalizedUsername
                      ? "This is how people find and mention you."
                      : "Recommended: choose a username so people can find you easily."}
              </p>
            </Field>

            <Field label="Display name" icon={UserRound}>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={100}
                placeholder="Your name"
                className="input-nuru"
              />
            </Field>

            <Field label="Bio">
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                maxLength={240}
                rows={4}
                placeholder="Tell people a little about your faith, interests or what you do."
                className="input-nuru min-h-28 resize-none py-3"
              />
              <p className="mt-1 text-right text-[11px] text-muted-foreground">{bio.length}/240</p>
            </Field>

            <Field label="Location" icon={MapPin}>
              <input
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                maxLength={80}
                placeholder="Country or region"
                className="input-nuru"
              />
            </Field>
          </div>

          <section className="mt-7 rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">What other people can see</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Your profile photo, display name, username, bio, location, public posts, public Reels
              and follower counts can appear on your Nuru public profile. Private messages,
              mentorship conversations and prayer-journal entries never appear there.
            </p>
          </section>

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || availability.isFetching}
            className="mt-6 min-h-12 w-full rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Saving profile…" : "Save profile"}
          </button>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {label}
      </span>
      {children}
    </label>
  );
}
