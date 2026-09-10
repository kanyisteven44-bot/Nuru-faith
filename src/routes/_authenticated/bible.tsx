import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { resolveMedia } from "@/lib/media";
import { fetchVerseOfTheDay, verseOfTheDayRef } from "@/lib/bible";
import { fetchDevotionals, fetchPlanDays, fetchReadingPlans } from "@/services/content";
import { fetchSavedScriptures, fetchSeries, removeSavedScripture } from "@/services/series";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { ScriptureText } from "@/components/nuru/Scripture";
import {
  CardSkeleton,
  Chip,
  EmptyState,
  IconTile,
  PillTabs,
  SectionHeader,
} from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/bible")({
  head: () => ({
    meta: [
      { title: "Bible & Devotionals — Nuru Faith" },
      {
        name: "description",
        content: "Daily devotionals, reading plans and Scripture explained for young believers.",
      },
      { property: "og:title", content: "Bible & Devotionals — Nuru Faith" },
      { property: "og:description", content: "Daily devotionals and reading plans." },
    ],
  }),
  component: BibleScreen,
});

const TABS = ["Devotionals", "Series", "Reading plans", "Saved"] as const;
type Tab = (typeof TABS)[number];

function BibleScreen() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("Devotionals");
  const [openId, setOpenId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [lookup, setLookup] = useState<string | null>(null);

  const verse = useQuery({
    queryKey: ["verse-of-the-day", verseOfTheDayRef()],
    queryFn: fetchVerseOfTheDay,
    staleTime: 1000 * 60 * 60,
  });
  const devotionals = useQuery({ queryKey: ["devotionals"], queryFn: fetchDevotionals });
  const plans = useQuery({ queryKey: ["reading-plans"], queryFn: fetchReadingPlans });
  const days = useQuery({
    queryKey: ["plan-days", planId],
    queryFn: () => fetchPlanDays(planId!),
    enabled: !!planId,
  });
  const series = useQuery({
    queryKey: ["series"],
    queryFn: () => fetchSeries(),
    enabled: tab === "Series",
  });
  const saved = useQuery({
    queryKey: ["saved-scriptures", userId],
    queryFn: () => fetchSavedScriptures(userId!),
    enabled: !!userId && tab === "Saved",
  });

  return (
    <AppShell>
      <ScreenHeader title="Bible" subtitle="Scripture, made clear" />

      {/* Verse of the day */}
      <section className="px-4 pt-4">
        <article className="nuru-card-hero p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan">
            Verse of the day
          </p>
          <p className="mt-3 font-display text-[17px] font-semibold leading-snug">
            {verse.data ? `"${verse.data.text}"` : "Loading today's verse…"}
          </p>
          <p className="mt-2 text-xs font-medium text-cyan">
            {verse.data
              ? `${verse.data.reference} · ${verse.data.translation}`
              : verseOfTheDayRef()}
          </p>
        </article>
      </section>

      <div className="px-4 py-3">
        <PillTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      <section className="px-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setLookup(query.trim());
          }}
          className="mb-4 flex items-center gap-2"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Look up a passage, e.g. John 1:1-5"
            aria-label="Look up a Bible passage"
            className="input-nuru flex-1"
          />
          <button
            type="submit"
            className="min-h-12 shrink-0 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground nuru-glow-sm"
          >
            Read
          </button>
        </form>

        {lookup && (
          <article className="nuru-card mb-4 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-cyan">
              {lookup}
            </p>
            <ScriptureText reference={lookup} className="mt-1 text-sm text-secondary-foreground" />
            <Link
              to="/ai"
              search={{
                contextType: "verse",
                contextLabel: lookup,
                q: `Explain ${lookup} in context.`,
              }}
              className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-xs font-semibold text-cyan"
            >
              <Sparkles className="h-3.5 w-3.5" /> Ask Nuru AI about this
            </Link>
          </article>
        )}

        <Link to="/ai" className="nuru-card mb-4 flex items-center gap-3 p-3.5">
          <IconTile icon={Sparkles} tone="cyan" size="lg" />
          <span className="flex-1">
            <span className="block text-sm font-semibold">Ask Nuru AI about a passage</span>
            <span className="block text-xs text-muted-foreground">
              Context, meaning and how it applies today
            </span>
          </span>
        </Link>
      </section>

      {tab === "Devotionals" && (
        <div className="space-y-3 px-4">
          {devotionals.isLoading && <CardSkeleton count={3} height="h-32" />}
          {devotionals.data?.length === 0 && (
            <EmptyState
              title="No devotionals yet"
              description="New devotionals are published each morning."
            />
          )}
          {(devotionals.data ?? []).map((d) => {
            const open = openId === d.id;
            return (
              <article key={d.id} className="nuru-card overflow-hidden">
                <img
                  src={resolveMedia(d.cover_url)}
                  alt=""
                  width={1024}
                  height={480}
                  loading="lazy"
                  className="h-36 w-full object-cover"
                />
                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-cyan">
                    {d.scripture_ref}
                  </p>
                  <h3 className="mt-1 font-display text-base font-semibold">{d.title}</h3>
                  {d.scripture_ref ? (
                    <ScriptureText
                      reference={d.scripture_ref}
                      className="mt-1 text-sm text-secondary-foreground"
                    />
                  ) : (
                    <p className="mt-1 text-sm italic text-secondary-foreground">
                      "{d.scripture_text}"
                    </p>
                  )}
                  {open && (
                    <p className="mt-3 text-sm leading-relaxed text-secondary-foreground">
                      {d.body}
                    </p>
                  )}
                  {open && d.subtitle && (
                    <p className="mt-3 rounded-2xl bg-surface-2 p-3 text-xs text-cyan">
                      {d.subtitle}
                    </p>
                  )}
                  <button
                    onClick={() => setOpenId(open ? null : d.id)}
                    className="mt-3 min-h-10 text-xs font-semibold text-cyan"
                    aria-expanded={open}
                  >
                    {open ? "Show less" : "Read devotional"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {tab === "Series" && (
        <div className="space-y-3 px-4">
          <p className="text-xs text-muted-foreground">
            Study one real-life question through connected passages — context, reflection, prayer
            and one step to take.
          </p>
          {series.isLoading && <CardSkeleton count={3} height="h-28" />}
          {series.data?.length === 0 && (
            <EmptyState title="No series yet" description="Scripture Series are being prepared." />
          )}
          {(series.data ?? []).map((s) => (
            <Link
              key={s.id}
              to="/series/$slug"
              params={{ slug: s.slug }}
              className="nuru-card flex gap-3 overflow-hidden active:opacity-90"
            >
              <img
                src={resolveMedia(s.cover_image)}
                alt=""
                loading="lazy"
                className="h-24 w-24 shrink-0 object-cover"
              />
              <div className="min-w-0 flex-1 py-3 pr-3">
                <p className="text-[11px] font-semibold tracking-widest text-cyan uppercase">
                  {s.category}
                </p>
                <p className="truncate text-sm font-semibold">{s.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {s.session_count} sessions · {s.estimated_duration} min
                </p>
              </div>
            </Link>
          ))}
          <Link to="/series" className="block py-2 text-center text-xs font-semibold text-cyan">
            See all Scripture Series
          </Link>
        </div>
      )}

      {tab === "Saved" && (
        <div className="space-y-3 px-4">
          {!userId && (
            <EmptyState
              title="Sign in to save passages"
              description="Your saved Scripture lives here."
            />
          )}
          {saved.isLoading && <CardSkeleton count={3} height="h-20" />}
          {userId && saved.data?.length === 0 && (
            <EmptyState
              title="Nothing saved yet"
              description="Tap the bookmark on a passage in a Scripture Series to keep it here."
            />
          )}
          {(saved.data ?? []).map((row) => (
            <article key={row.id} className="nuru-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-cyan">{row.reference}</p>
                <button
                  aria-label={`Remove ${row.reference}`}
                  onClick={() => {
                    void removeSavedScripture(userId!, row.reference)
                      .then(() => qc.invalidateQueries({ queryKey: ["saved-scriptures", userId] }))
                      .catch(() => toast.error("Couldn't remove that"));
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <ScriptureText
                reference={row.reference}
                className="mt-1 text-sm text-secondary-foreground"
              />
            </article>
          ))}
        </div>
      )}

      {tab === "Reading plans" && (
        <div className="space-y-3 px-4">
          {plans.isLoading && <CardSkeleton count={3} height="h-24" />}
          {(plans.data ?? []).map((p) => {
            const open = planId === p.id;
            return (
              <article key={p.id} className="nuru-card p-4">
                <div className="flex items-center gap-3">
                  <IconTile icon={BookOpen} tone="brand" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.title}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{p.description}</p>
                  </div>
                  <Chip tone="brand">{p.days} days</Chip>
                </div>
                <button
                  onClick={() => setPlanId(open ? null : p.id)}
                  aria-expanded={open}
                  className="mt-3 min-h-10 text-xs font-semibold text-cyan"
                >
                  {open ? "Hide plan" : "View plan"}
                </button>
                {open && (
                  <ol className="mt-2 space-y-2">
                    {days.isLoading && <CardSkeleton count={3} height="h-12" />}
                    {(days.data ?? []).map((d) => (
                      <li key={d.id} className="rounded-2xl bg-surface-2 p-3">
                        <p className="text-xs font-semibold text-cyan">Day {d.day_number}</p>
                        <p className="text-sm font-medium">{d.scripture_ref}</p>
                        {d.scripture_ref && (
                          <ScriptureText
                            reference={d.scripture_ref}
                            className="mt-1 text-xs text-secondary-foreground"
                            clamp
                          />
                        )}
                        {d.reflection && (
                          <p className="mt-1 text-xs text-muted-foreground">{d.reflection}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </article>
            );
          })}
        </div>
      )}

      <div className="px-4 pt-6">
        <SectionHeader title="Full Bible reader" action="Coming soon" />
        <p className="text-xs text-muted-foreground">
          Chapter-by-chapter reading with highlights and notes is on the way.
        </p>
      </div>
    </AppShell>
  );
}
