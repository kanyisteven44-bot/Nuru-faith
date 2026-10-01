import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { COUNTRIES, DENOMINATIONS, INTERESTS } from "@/constants/nuru";
import { fetchChurches, joinChurch, saveInterests, updateProfile } from "@/services/content";
import { GradientButton } from "@/components/nuru/Primitives";
import { NuruLogo } from "@/components/nuru/Logo";
import hero from "@/assets/walk-purpose.jpg";

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
  const [saving, setSaving] = useState(false);

  const { data: churches = [] } = useQuery({
    queryKey: ["churches", denomination],
    queryFn: () => fetchChurches(),
  });

  const filteredChurches = denomination
    ? churches.filter((c) => c.denomination === denomination || !c.denomination)
    : churches;

  async function finish() {
    if (!userId) return;
    setSaving(true);
    try {
      await updateProfile(userId, {
        full_name: fullName.trim() || null,
        username:
          username
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "") || null,
        country,
        denomination: denomination || null,
        church_id: churchId,
        onboarded: true,
      });
      await saveInterests(userId, interests);
      if (churchId) await joinChurch(userId, churchId).catch(() => {});
      toast.success("Welcome to Nuru Faith");
      navigate({ to: "/home", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save your profile");
    } finally {
      setSaving(false);
    }
  }

  const steps = ["About you", "Your faith", "What you love", "Your church"];

  return (
    <div className="relative min-h-dvh bg-background">
      <img
        src={hero}
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

        <h1 className="font-display text-2xl font-semibold">{steps[step]}</h1>

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
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={30}
                  className="input-nuru"
                  placeholder="stephen"
                />
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
              <p className="text-sm text-muted-foreground">Where are you on your journey?</p>
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
                Join your church community — you can change this later.
              </p>
              <div className="space-y-2">
                {filteredChurches.map((c) => (
                  <SelectCard
                    key={c.id}
                    selected={churchId === c.id}
                    onClick={() => setChurchId(churchId === c.id ? null : c.id)}
                    title={c.name}
                    hint={[c.denomination, c.city].filter(Boolean).join(" · ")}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-4 mt-6">
          {step < 3 ? (
            <GradientButton
              className="w-full"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 2 && interests.length < 3}
            >
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
        selected ? "border-cyan bg-surface-2" : "border-border bg-surface hover:bg-surface-2",
      )}
    >
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      {selected && <Check className="h-4 w-4 text-cyan" />}
    </button>
  );
}
