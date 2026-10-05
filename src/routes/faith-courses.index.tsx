import { ReadingQuickAccess } from "@/components/nuru/ReadingQuickAccess";
import externalCourses from "@/data/externalCourses.json";
import { CoverImage } from "@/components/nuru/CoverImage";
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronRight,
  Clock3,
  GraduationCap,
  Search,
  Sparkles,
  ExternalLink,
} from "lucide-react";
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

export const Route = createFileRoute("/faith-courses/")({
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
  const [provider, setProvider] = useState("all");
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

  const externalFiltered = externalCourses.filter(
    (item) =>
      (!category || item.category === category) &&
      (!query.trim() ||
        `${item.title} ${item.provider} ${item.category}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())),
  );
  const nativeVisible = provider !== "BibleProject";
  const externalVisible = provider !== "Nuru";

  return (
    <AppShell>
      <ScreenHeader title="Faith Courses" subtitle="Learn deeply. Live faithfully." />
      <div className="px-4">
        <ReadingQuickAccess />
      </div>

      <div className="space-y-6 px-4 pb-6">
        <section className="nuru-card relative h-52 overflow-hidden lg:h-80">
          <CoverImage
            src={hero}
            loading="eager"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/20" />
          <div className="relative flex h-full max-w-[78%] flex-col justify-end p-4">
            <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full border border-leaf/25 bg-leaf/10 px-2.5 py-1 text-[10px] font-bold tracking-wide text-leaf uppercase">
              <GraduationCap className="h-3.5 w-3.5" />
              Nuru Learning
            </span>
            <h1 className="font-display text-[27px] leading-tight font-bold text-white">
              Build a faith you understand.
            </h1>
            <p className="mt-2 text-[12px] leading-relaxed text-white/75">
              {FAITH_COURSES.length} Nuru study courses plus {externalCourses.length} free
              BibleProject classes.
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
          {[...new Set([...FAITH_COURSE_CATEGORIES, "Bible study"])].map((item) => (
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

        {!query && !category && nativeVisible && (
          <section>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.15em] text-leaf uppercase">
                  Start here
                </p>
                <h2 className="font-display text-lg font-bold">Foundational courses</h2>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {FAITH_COURSES.length + externalCourses.length} courses
              </span>
            </div>

            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
              {FEATURED_FAITH_COURSES.map((item) => (
                <FeaturedCourseCard key={item.slug} course={item} />
              ))}
            </div>
          </section>
        )}

        <label className="flex items-center gap-3 text-sm">
          Learn with
          <select
            aria-label="Course provider"
            className="input-nuru flex-1"
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
          >
            <option value="all">All providers</option>
            <option value="Nuru">Nuru study courses</option>
            <option value="BibleProject">BibleProject classes</option>
          </select>
        </label>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[15px] font-semibold">
              {category ?? (query ? "Search results" : "All courses")}
            </h2>
            <span className="text-[11px] text-muted-foreground">
              {(nativeVisible ? filtered.length : 0) +
                (externalVisible ? externalFiltered.length : 0)}{" "}
              found
            </span>
          </div>

          <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {(nativeVisible ? filtered : []).map((item) => (
              <CourseRow key={item.slug} course={item} />
            ))}
          </div>
        </section>

        {externalVisible && externalFiltered.length > 0 && (
          <section>
            <h2 className="font-display text-lg font-semibold">Study with BibleProject</h2>
            <p className="mt-1 mb-4 text-xs leading-relaxed text-ink-2">
              Free classes hosted by BibleProject. Opens their website; a separate account may be
              needed. Class progress stays with the provider.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {externalFiltered.map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nuru-card flex min-h-24 items-center gap-3 p-4 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <BookOpen className="h-6 w-6 shrink-0 text-primary" />
                  <span className="flex-1">
                    <span className="block text-[10px] font-semibold text-primary uppercase">
                      {item.provider} · Free class
                    </span>
                    <span className="mt-1 block font-display font-semibold">{item.title}</span>
                    <span className="mt-1 block text-xs text-ink-2">
                      Open class on BibleProject
                    </span>
                  </span>
                  <ExternalLink
                    className="h-4 w-4 shrink-0 text-ink-2"
                    aria-label="Opens new tab"
                  />
                </a>
              ))}
            </div>
          </section>
        )}
        {(nativeVisible ? filtered.length : 0) + (externalVisible ? externalFiltered.length : 0) ===
          0 && (
          <p className="py-6 text-center text-sm text-ink-2">
            No courses match. Try another search or provider.
          </p>
        )}
        <a
          href="https://www.biblicaltraining.org/classes"
          target="_blank"
          rel="noopener noreferrer"
          className="nuru-card flex items-center gap-3 p-4"
        >
          <GraduationCap className="h-5 w-5 shrink-0 text-primary" />
          <span className="flex-1">
            <span className="block font-semibold">Explore more with BiblicalTraining</span>
            <span className="mt-1 block text-xs text-ink-2">
              Browse their full class catalogue. Free lectures; separate registration and optional
              paid credentials.
            </span>
          </span>
          <ExternalLink className="h-4 w-4 shrink-0" />
        </a>
        <Link to="/books" className="nuru-card flex min-h-14 items-center gap-3 p-4 font-semibold">
          <BookOpen className="h-5 w-5 text-primary" /> Explore Christian books{" "}
          <ChevronRight className="ml-auto h-4 w-4" />
        </Link>
        <section className="nuru-card flex items-start gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-leaf">
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
      className="nuru-card relative block h-52 w-64 shrink-0 overflow-hidden active:opacity-95 lg:w-full lg:transition-colors lg:hover:border-cyan/50"
    >
      <CoverImage
        src={resolveMedia(course.cover)}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
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
      className="nuru-card flex items-center gap-3 p-2.5 active:opacity-90 lg:gap-4 lg:p-4 lg:transition-colors lg:hover:border-cyan/50"
    >
      <CoverImage
        src={resolveMedia(course.cover)}
        alt=""
        loading="lazy"
        className="h-16 w-16 shrink-0 rounded-xl object-cover lg:h-20 lg:w-20"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold tracking-wide text-leaf uppercase">
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
