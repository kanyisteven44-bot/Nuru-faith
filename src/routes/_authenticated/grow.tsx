import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ChevronRight, GraduationCap, Sunrise } from "lucide-react";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { CoverImage } from "@/components/nuru/CoverImage";
import { resolveMedia } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/grow")({
  head: () => ({
    meta: [
      { title: "Learning — Nuru Faith" },
      {
        name: "description",
        content: "Courses, devotionals and Scripture Series in one learning hub.",
      },
    ],
  }),
  component: GrowScreen,
});

const LEARNING_OPTIONS = [
  {
    to: "/faith-courses",
    label: "Courses",
    eyebrow: "Structured learning",
    description: "Lesson-by-lesson learning for faith, discipleship, prayer and Christian living.",
    icon: BookOpen,
    image: "asset:reading-scripture",
    tone: "text-primary bg-primary/10 border-primary/25",
  },
  {
    to: "/devotionals",
    label: "Devotions",
    eyebrow: "Daily",
    description: "Short Bible-centred readings for prayer, reflection and everyday faith.",
    icon: Sunrise,
    image: "asset:cross-sunrise",
    tone: "text-growth bg-growth/10 border-growth/25",
  },
  {
    to: "/series",
    label: "Series",
    eyebrow: "Deep study",
    description: "Multi-session Scripture studies with teaching, reflection, prayer and action.",
    icon: GraduationCap,
    image: "asset:bible-candle",
    tone: "text-warning bg-warning/10 border-warning/25",
  },
] as const;

function GrowScreen() {
  return (
    <AppShell>
      <ScreenHeader title="Learning" subtitle="Courses, devotions and Scripture Series" />

      <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-2">
        <div className="grid gap-4">
          {LEARNING_OPTIONS.map(({ to, label, eyebrow, description, icon: Icon, image, tone }) => (
            <Link
              key={to}
              to={to}
              className="nuru-card group flex min-h-32 items-stretch gap-4 overflow-hidden p-0 transition-transform active:scale-[0.99]"
            >
              <span className="relative w-28 shrink-0 overflow-hidden sm:w-36">
                <CoverImage
                  src={resolveMedia(image)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                <span className={`absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-xl border bg-card/90 backdrop-blur ${tone}`}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
              </span>

              <span className="min-w-0 flex flex-1 flex-col justify-center py-4 pr-1">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {eyebrow}
                </span>
                <span className="mt-0.5 block font-display text-xl font-bold">{label}</span>
                <span className="mt-1 block text-[12px] leading-relaxed text-muted-foreground">
                  {description}
                </span>
              </span>

              <ChevronRight className="mr-4 self-center h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
