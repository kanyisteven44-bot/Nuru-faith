import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ChevronRight, GraduationCap, Sparkles, Sunrise } from "lucide-react";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { NURU_PHOTO_POOLS, useRotatingMedia } from "@/lib/rotatingMedia";

export const Route = createFileRoute("/_authenticated/grow")({
  head: () => ({
    meta: [
      { title: "Devotions & Series — Nuru Faith" },
      {
        name: "description",
        content: "Daily devotionals and deeper Scripture Series in one place.",
      },
    ],
  }),
  component: GrowScreen,
});

function GrowScreen() {
  const hero = useRotatingMedia(NURU_PHOTO_POOLS.courses, "grow-hub");

  return (
    <AppShell>
      <ScreenHeader title="Devotions & Series" subtitle="Read daily. Go deeper." />

      <div className="space-y-5 px-4 pb-6">
        <section className="nuru-card relative h-48 overflow-hidden">
          <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/78 to-background/20" />
          <div className="relative flex h-full max-w-[80%] flex-col justify-end p-4">
            <p className="text-[10px] font-bold tracking-[0.15em] text-cyan uppercase">
              Grow in Scripture
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-white">
              One place for daily reflection and deeper study.
            </h1>
          </div>
        </section>

        <Link
          to="/devotionals"
          className="nuru-card flex items-center gap-4 p-4 active:opacity-90"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-lg shadow-black/25">
            <Sunrise className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold tracking-[0.14em] text-growth uppercase">
              Daily
            </span>
            <span className="mt-0.5 block font-display text-lg font-bold">Devotionals</span>
            <span className="mt-1 block text-[12px] leading-relaxed text-muted-foreground">
              Short Bible-centred readings for prayer, reflection and everyday faith.
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>

        <Link
          to="/series"
          className="nuru-card flex items-center gap-4 p-4 active:opacity-90"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-amber-600 text-white shadow-lg shadow-black/25">
            <GraduationCap className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold tracking-[0.14em] text-warning uppercase">
              Deep study
            </span>
            <span className="mt-0.5 block font-display text-lg font-bold">Scripture Series</span>
            <span className="mt-1 block text-[12px] leading-relaxed text-muted-foreground">
              Multi-session studies with context, teaching, reflection, prayer and action.
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>

        <Link
          to="/faith-courses"
          className="relative overflow-hidden rounded-2xl border border-primary/30 bg-primary/10 p-4 active:opacity-90"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-cyan">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Need structured learning?</span>
              <span className="mt-1 block text-[12px] leading-relaxed text-muted-foreground">
                Faith Courses turns topics like baptism, prayer and discipleship into lesson-by-lesson learning.
              </span>
            </span>
            <BookOpen className="h-4 w-4 shrink-0 text-cyan" />
          </div>
        </Link>
      </div>
    </AppShell>
  );
}
