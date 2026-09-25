import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ChevronRight, Clock3, GraduationCap, Search, Sparkles } from "lucide-react";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { Chip } from "@/components/nuru/Primitives";
import { cn } from "@/lib/utils";
import { resolveMedia } from "@/lib/media";
import {
  FAITH_COURSES,
  FAITH_COURSE_CATEGORIES,
  FEATURED_FAITH_COURSES,
  type FaithCourse,
} from "@/data/faithCourses";
import { NURU_PHOTO_POOLS, useRotatingMedia } from "@/lib/rotatingMedia";

export const Route = createFileRoute("/_authenticated/faith-courses/")({
  head: () => ({
    meta: [
      { title: "Faith Courses — Nuru Faith" },
      {
        name: "description",
        content:
          "Structured Christian learning on baptism, prayer, discipleship, relationships, Scripture and everyday faith.",
      },
    ],
  }),
  component: FaithCoursesScreen,
});

function FaithCoursesScreen() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const hero = useRotatingMedia(NURU_PHOTO_POOLS.courses, "faith-courses-hero");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAITH_COURSES.filter((item) => {
      const matchesCategory = !category || item.category === category;
      const matchesQuery =
        !q || `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, category]);

  return (
    <AppShell>
      <ScreenHeader title="Faith Courses" subtitle="Learn deeply. Live faithfully." />

      <div className="space-y-6 px-4 pb-6 lg:px-6">
        <section className="nuru-card relative h-64 overflow-hidden lg:h-80">
          <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/20" />
          <div className="relative flex h-full max-w-[80%] flex-col justify-end p-6 lg:max-w-[55%] lg:p-9">
            <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full border border-cyan/25 bg-cyan/10 px-2.5 py-1 text-[10px] font-bold tracking-wide text-cyan uppercase">
              <GraduationCap className="h-3.5 w-3.5" />
              Nuru Learning
            </span>
            <h1 className="font-display text-[32px] leading-tight font-semibold text-white lg:text-[48px]">
              Learn with depth. Live with purpose.
            </h1>
            <p className="mt-2 text-[12px] leading-relaxed text-white/75">
              60 structured courses from Christian foundations to deeper Bible study and everyday
              discipleship.
            </p>
          </div>
        </section>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search baptism, prayer, relationships…"
            aria-label="Search Faith Courses"
            className="input-nuru pl-11"
          />
        </div>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold",
              category === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface-2 text-secondary-foreground",
            )}
          >
            All
          </button>
          {FAITH_COURSE_CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold",
                category === item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface-2 text-secondary-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </div>

        {!query && !category && (
          <section>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.15em] text-cyan uppercase">
                  Start here
                </p>
                <h2 className="font-display text-lg font-bold">Foundational courses</h2>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {FAITH_COURSES.length} courses
              </span>
            </div>

            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {FEATURED_FAITH_COURSES.map((item) => (
                <FeaturedCourseCard key={item.slug} course={item} />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[15px] font-semibold">
              {category ?? (query ? "Search results" : "All courses")}
            </h2>
            <span className="text-[11px] text-muted-foreground">{filtered.length} found</span>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {filtered.map((item) => (
              <CourseRow key={item.slug} course={item} />
            ))}
          </div>
        </section>

        <section className="nuru-card flex items-start gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-cyan">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Bible-first learning</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              Courses use Scripture references and teaching written for Nuru. Where Christian
              traditions differ, the lesson says so instead of hiding the difference.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function FeaturedCourseCard({ course }: { course: FaithCourse }) {
  return (
    <Link
      to="/faith-courses/$slug"
      params={{ slug: course.slug }}
      className="nuru-card relative block h-52 w-64 shrink-0 overflow-hidden active:opacity-95"
    >
      <img
        src={resolveMedia(course.cover)}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <Chip tone="brand">{course.category}</Chip>
        <h3 className="mt-2 font-display text-xl leading-tight font-bold text-white">
          {course.title}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/75">
          <BookOpen className="h-3.5 w-3.5" />
          {course.lessons.length} lessons
          <span>•</span>
          <Clock3 className="h-3.5 w-3.5" />
          {course.estimatedMinutes} min
        </p>
      </div>
    </Link>
  );
}

function CourseRow({ course }: { course: FaithCourse }) {
  return (
    <Link
      to="/faith-courses/$slug"
      params={{ slug: course.slug }}
      className="nuru-card flex items-center gap-3 p-2.5 active:opacity-90"
    >
      <img
        src={resolveMedia(course.cover)}
        alt=""
        loading="lazy"
        className="h-16 w-16 shrink-0 rounded-xl object-cover"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold tracking-wide text-cyan uppercase">
          {course.category} · {course.level}
        </span>
        <span className="mt-0.5 block truncate font-display text-sm font-semibold">
          {course.title}
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {course.lessons.length} lessons
          <span>•</span>
          {course.estimatedMinutes} min
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
