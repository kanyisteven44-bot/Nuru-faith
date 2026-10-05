import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ChevronRight, GraduationCap, Sunrise } from "lucide-react";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";

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
    tone: "text-primary bg-primary/10 border-primary/25",
  },
  {
    to: "/devotionals",
    label: "Devotions",
    eyebrow: "Daily",
    description: "Short Bible-centred readings for prayer, reflection and everyday faith.",
    icon: Sunrise,
    tone: "text-growth bg-growth/10 border-growth/25",
  },
  {
    to: "/series",
    label: "Series",
    eyebrow: "Deep study",
    description: "Multi-session Scripture studies with teaching, reflection, prayer and action.",
    icon: GraduationCap,
    tone: "text-warning bg-warning/10 border-warning/25",
  },
] as const;

function GrowScreen() {
  return (
    <AppShell>
      <ScreenHeader title="Learning" subtitle="Courses, devotions and Scripture Series" />

      <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-2">
        <div className="grid gap-4">
          {LEARNING_OPTIONS.map(({ to, label, eyebrow, description, icon: Icon, tone }) => (
            <Link
              key={to}
              to={to}
              className="nuru-card flex min-h-28 items-center gap-4 p-4 transition-transform active:scale-[0.99]"
            >
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${tone}`}
              >
                <Icon className="h-6 w-6" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {eyebrow}
                </span>
                <span className="mt-0.5 block font-display text-xl font-bold">{label}</span>
                <span className="mt-1 block text-[12px] leading-relaxed text-muted-foreground">
                  {description}
                </span>
              </span>

              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
