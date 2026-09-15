import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { resolveMedia } from "@/lib/media";
import { fetchVerseOfTheDay, verseOfTheDayRef } from "@/lib/bible";
import { fetchDevotionals, fetchReadingPlans } from "@/services/content";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, PillTabs } from "@/components/nuru/Primitives";
import verseBg from "@/assets/bible-candle.jpg";

export const Route = createFileRoute("/_authenticated/devotionals")({
  head: () => ({
    meta: [
      { title: "Devotionals — Nuru Faith" },
      {
        name: "description",
        content: "A daily verse and short devotional readings to grow your faith.",
      },
    ],
  }),
  component: DevotionalsScreen,
});

const TABS = ["Daily", "Topics", "My Plan"] as const;
type Tab = (typeof TABS)[number];

function DevotionalsScreen() {
  const [tab, setTab] = useState<Tab>("Daily");
  const verse = useQuery({ queryKey: ["verse-of-day"], queryFn: fetchVerseOfTheDay });
  const plans = useQuery({ queryKey: ["reading-plans"], queryFn: fetchReadingPlans });
  const devotionals = useQuery({ queryKey: ["devotionals"], queryFn: fetchDevotionals });

  const rows = devotionals.data ?? [];
  const topics = [...new Set(rows.map((d) => d.subtitle).filter(Boolean))] as string[];

  return (
    <AppShell>
      <ScreenHeader
        title="Devotionals"
        right={
          <Link
            to="/explore"
            search={{ q: "", kind: "all" }}
            aria-label="Search devotionals"
            className="p-1 text-secondary-foreground"
          >
            <Search className="h-5 w-5" />
          </Link>
        }
      />

      <div className="px-4 pb-2">
        <PillTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === "Daily" && (
        <div className="space-y-6 px-4 pt-2">
          <section className="nuru-card relative overflow-hidden">
            <img src={verseBg} alt="" className="h-44 w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-card/30" />
            <div className="absolute inset-0 flex flex-col justify-between p-4">
              <div className="flex items-start justify-between">
                <span className="font-display text-base font-semibold">Verse of the Day</span>
                <span className="rounded-full bg-background/65 px-2.5 py-1 text-[11px] backdrop-blur">
                  {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>
              <div>
                <p className="line-clamp-3 text-sm leading-relaxed italic">
                  “{verse.data?.text ?? "Your word is a lamp for my feet, a light on my path."}”
                </p>
                <p className="mt-1 text-xs font-medium text-cyan">
                  {verse.data?.reference ?? verseOfTheDayRef()} (NIV)
                </p>
              </div>
            </div>
          </section>

          <Link
            to="/bible"
            className="flex min-h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground nuru-glow-sm"
          >
            Read Devotional
          </Link>

          <section>
            <h2 className="mb-3 font-display text-[15px] font-semibold">Recent Devotionals</h2>
            {devotionals.isLoading && <CardSkeleton count={3} height="h-16" />}
            {!devotionals.isLoading && rows.length === 0 && (
              <EmptyState
                title="No devotionals yet"
                description="Daily readings will appear here as they're published."
              />
            )}
            <ul className="space-y-2">
              {rows.map((d) => (
                <li key={d.id}>
                  <Link to="/bible" className="nuru-card flex items-center gap-3 p-2.5">
                    <img
                      src={d.cover_url ? resolveMedia(d.cover_url) : verseBg}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{d.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {new Date(d.publish_date).toLocaleDateString(undefined, {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {tab === "Topics" && (
        <div className="px-4 pt-2">
          {topics.length === 0 ? (
            <EmptyState
              title="No topics yet"
              description="Devotional topics appear once readings are tagged."
            />
          ) : (
            <ul className="space-y-2">
              {topics.map((t) => (
                <li key={t} className="nuru-card px-4 py-3 text-sm font-medium">
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "My Plan" && (
        <div className="space-y-2 px-4 pt-2">
          {plans.isLoading && <CardSkeleton count={3} height="h-16" />}
          {!plans.isLoading && (plans.data ?? []).length === 0 && (
            <EmptyState
              title="No reading plans yet"
              description="Guided plans will appear here as they're published."
            />
          )}
          {(plans.data ?? []).map((p) => (
            <div key={p.id} className="nuru-card flex items-center gap-3 p-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-primary/12 text-[11px] font-bold text-cyan">
                {p.days}d
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{p.title}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {p.description ?? `${p.days}-day plan`}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
