import { CoverImage } from "@/components/nuru/CoverImage";
import { resolveMedia } from "@/lib/media";
import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { COUNTRIES, DENOMINATIONS, INTERESTS } from "@/constants/nuru";
import {
  checkUsernameAvailability,
  fetchChurches,
  fetchInterests,
  fetchJourneyStage,
  fetchProfile,
  joinChurch,
  saveOnboardingInterests,
  updateProfile,
} from "@/services/content";
import { GradientButton } from "@/components/nuru/Primitives";
import { NuruLogo } from "@/components/nuru/Logo";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your profile — Nuru Faith" },
      {
        name: "description",
        content: "Tell us about your faith journey so Nuru Faith can guide you well.",
      },
      { property: "og:title", content: "Set up your profile — Nuru Faith" },
      { property: "og:description", content: "Tell us about your faith journey." },
    ],
  }),
  component: Onboarding,
});

const STAGES = [
  { key: "new", label: "New to faith", hint: "I'm just starting to explore" },
  { key: "growing", label: "Growing", hint: "I'm learning and building habits" },
  { key: "committed", label: "Committed", hint: "I walk with God daily" },
  { key: "serving", label: "Serving", hint: "I lead or serve in ministry" },
];

function Onboarding() {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("Kenya");
  const [denomination, setDenomination] = useState("");
  const [stage, setStage] = useState("growing");
  const [interests, setInterests] = useState<string[]>([]);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [churchSearch, setChurchSearch] = useState("");
  const [churchLimit, setChurchLimit] = useState(30);
  const [saving, setSaving] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const prefilled = useRef(false);

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  const existingInterests = useQuery({
    queryKey: ["interests", userId],
    queryFn: () => fetchInterests(userId!),
    enabled: !!userId,
  });
  const existingStage = useQuery({
    queryKey: ["journey-stage", userId],
    queryFn: () => fetchJourneyStage(userId!),
    enabled: !!userId,
  });
  const { data: churches = [], ...churchQuery } = useQuery({
    queryKey: ["churches", "onboarding"],
    queryFn: () => fetchChurches(),
    enabled: step === 3,
  });

  useEffect(() => {
    if (prefilled.current || !profile.data) return;
    prefilled.current = true;
    setFullName(profile.data.full_name ?? "");
    setUsername(profile.data.username ?? "");
    setCountry(profile.data.country || "Kenya");
    setDenomination(profile.data.denomination ?? "");
    setChurchId(profile.data.church_id ?? null);
  }, [profile.data]);

  useEffect(() => {
    if ((existingInterests.data?.length ?? 0) > 0 && interests.length === 0) {
      setInterests(existingInterests.data ?? []);
    }
  }, [existingInterests.data, interests.length]);

  useEffect(() => {
    if (existingStage.data && STAGES.some((item) => item.key === existingStage.data)) {
      setStage(existingStage.data);
    }
  }, [existingStage.data]);

  const denominationChurches = denomination
    ? churches.filter(
        (c) =>
          c.denomination === denomination ||
          !c.denomination ||
          (denomination === "Presbyterian (PCEA)" && c.denomination === "Presbyterian"),
      )
    : churches;
  const filteredChurches = denominationChurches.filter((c) =>
    [c.name, c.region, c.city, c.denomination]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase()
      .includes(churchSearch.trim().toLocaleLowerCase()),
  );

  const cleanUsername = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "");
  const aboutReady = fullName.trim().length >= 2 && cleanUsername.length >= 3;

  async function advance() {
    if (!userId) return;
    if (step !== 0) {
      setStep((current) => current + 1);
      return;
    }
    if (!aboutReady) return;

    setCheckingUsername(true);
    try {
      const available = await checkUsernameAvailability(cleanUsername, userId);
      if (!available) {
        toast.error("That username is already taken. Try another one.");
        return;
      }
      setStep(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't check that username");
    } finally {
      setCheckingUsername(false);
    }
  }

  async function finish() {
    if (!userId) return;
    if (!aboutReady) {
      toast.error("Add your name and a username with at least 3 characters.");
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      // Keep onboarding false until every user-owned setup write succeeds. This
      // makes retries safe if a network interruption happens during the last step.
      await updateProfile(userId, {
        full_name: fullName.trim() || null,
        username: cleanUsername || null,
        country,
        denomination: denomination || null,
        church_id: churchId,
        onboarded: false,
      });
      await saveOnboardingInterests(userId, interests, stage);
      if (churchId) await joinChurch(userId, churchId);
      await updateProfile(userId, { onboarded: true });
      toast.success("You're all set. Welcome to Nuru Faith!");
      navigate({ to: "/home", replace: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not save your profile";
      if (/duplicate|unique|username/i.test(message)) {
        toast.error("That username is already taken. Choose another one.");
        setStep(0);
      } else {
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  }

  const steps = ["About you", "Your faith", "What you love", "Your church"];

  return (
    <div className="relative min-h-dvh bg-background">
      <CoverImage
        src={resolveMedia("asset:walk-purpose")}
        alt=""
        loading="eager"
        className="absolute inset-x-0 top-0 h-64 w-full object-cover opacity-30"
      />
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-background/20 to-background" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              aria-label="Back"
              className="rounded-full p-2 hover:bg-surface-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <NuruLogo compact />
        </div>

        <div
          className="mb-6 flex gap-1.5"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={4}
        >
          {steps.map((s, i) => (
            <span
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full",
                i <= step ? "nuru-gradient-bg" : "bg-surface-2",
              )}
            />
          ))}
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Step {step + 1} of {steps.length}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold">{steps[step]}</h1>

        <div className="mt-6 flex-1 space-y-4">
          {step === 0 && (
            <>
              <Labeled label="Full name" id="ob-name">
                <input
                  id="ob-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={100}
                  className="input-nuru"
                  placeholder="Stephen Mwangi"
                />
              </Labeled>
              <Labeled label="Username" id="ob-user">
                <input
                  id="ob-user"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9._]/g, "")
                        .slice(0, 30),
                    )
                  }
                  minLength={3}
                  maxLength={30}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="input-nuru"
                  placeholder="stephen"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  3–30 characters. Use lowercase letters, numbers, dots or underscores.
                </p>
              </Labeled>
              <Labeled label="Country" id="ob-country">
                <select
                  id="ob-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="input-nuru"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Labeled>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Choose what best describes you right now. This helps Nuru shape a gentler starting point, and you can change it later.
              </p>
              <div className="space-y-2">
                {STAGES.map((s) => (
                  <SelectCard
                    key={s.key}
                    selected={stage === s.key}
                    onClick={() => setStage(s.key)}
                    title={s.label}
                    hint={s.hint}
                  />
                ))}
              </div>
              <Labeled label="Denomination (optional)" id="ob-denom">
                <select
                  id="ob-denom"
                  value={denomination}
                  onChange={(e) => setDenomination(e.target.value)}
                  className="input-nuru"
                >
                  <option value="">Prefer not to say</option>
                  {DENOMINATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Labeled>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">
                Pick at least three so we can shape your feed.
              </p>
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
                        "min-h-11 rounded-full border px-4 text-sm transition-colors",
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
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">
                Choose your church — you can change this later. Map listings do not mean a church
                has joined Nuru Faith.
              </p>
              <input
                aria-label="Find your church"
                className="input-nuru w-full"
                placeholder="Church name, county or town"
                value={churchSearch}
                onChange={(event) => {
                  setChurchSearch(event.target.value);
                  setChurchLimit(30);
                }}
              />
              {churchQuery.isLoading ? (
                <div className="flex min-h-24 items-center justify-center rounded-2xl border border-border bg-surface-2 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading churches…
                </div>
              ) : churchQuery.isError ? (
                <button
                  type="button"
                  onClick={() => void churchQuery.refetch()}
                  className="btn-nuru-ghost min-h-11 w-full"
                >
                  Church list didn't load — try again
                </button>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    {filteredChurches.length} churches found
                  </p>
                  <div className="space-y-2">
                    {filteredChurches.slice(0, churchLimit).map((c) => (
                  <SelectCard
                    key={c.id}
                    selected={churchId === c.id}
                    onClick={() => setChurchId(churchId === c.id ? null : c.id)}
                    title={c.name}
                    hint={[c.region, c.city, c.denomination].filter(Boolean).join(" · ")}
                  />
                    ))}
                  </div>
                  {churchLimit < filteredChurches.length && (
                    <button
                      type="button"
                      className="btn-nuru-ghost min-h-11"
                      onClick={() => setChurchLimit((limit) => limit + 30)}
                    >
                      Show more churches
                    </button>
                  )}
                </>
              )}
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                Can't find your church? That's okay — this step is optional and you can add it later.
              </p>
            </>
          )}
        </div>

        <div className="sticky bottom-4 mt-6">
          {step < 3 ? (
            <GradientButton
              className="w-full"
              onClick={() => void advance()}
              disabled={
                checkingUsername ||
                (step === 0 && !aboutReady) ||
                (step === 2 && interests.length < 3)
              }
            >
              {checkingUsername && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue
            </GradientButton>
          ) : (
            <GradientButton className="w-full" onClick={finish} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enter Nuru Faith
            </GradientButton>
          )}
        </div>
      </div>
    </div>
  );
}

function Labeled({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function SelectCard({
  selected,
  onClick,
  title,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
        selected ? "border-leaf bg-surface-2" : "border-border bg-surface hover:bg-surface-2",
      )}
    >
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      {selected && <Check className="h-4 w-4 text-leaf" />}
    </button>
  );
}
