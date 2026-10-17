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
import { LearningLinks } from "@/components/nuru/LearningLinks";

export const Route = createFileRoute("/faith-courses/")({
  head: () => ({
    meta: [
      { title: "Christian Faith Courses & Bible Studies | Nuru Faith" },
      {
        name: "description",
        content:
          "Explore Christian courses on prayer, discipleship, baptism, relationships, Scripture and everyday faith with Nuru Faith.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Christian Faith Courses & Bible Studies | Nuru Faith" },
      {
        property: "og:description",
        content:
          "Structured Christian learning on prayer, discipleship, Scripture, relationships and everyday faith.",
      },
      { property: "og:url", content: "https://nurufaith.co.ke/faith-courses/" },
    ],
    links: [{ rel: "canonical", href: "https://nurufaith.co.ke/faith-courses/" }],
  }),
  component: FaithCoursesScreen,
});

function FaithCoursesScreen() {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("all");
  const [category, setCategory] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const [format, setFormat] = useState("all");
  const hero = useRotatingMedia(NURU_PHOTO_POOLS.courses, "faith-courses-hero");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAITH_COURSES.filter((item) => {
      const matchesCategory = !category || item.category === category;
      const matchesQuery =
        !q || `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(q);
      const matchesFormat =
        format === "all" || (format === "extended" ? item.extended : item.guidedStudy);
      return matchesCategory && matchesQuery && matchesFormat;
    });
  }, [query, category, format]);

  const externalFiltered = externalCourses.filter(
    (item) =>
      format === "all" &&
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
      <LearningLinks active="Courses" />

      <div className="mx-auto max-w-6xl space-y-7 px-4 pb-10 sm:px-6">
        <section className="nuru-card relative min-h-72 overflow-hidden lg:min-h-96">
          <CoverImage
            src={hero}
            loading="eager"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/20" />
          <div className="relative flex min-h-72 max-w-xl flex-col justify-center p-6 sm:p-10 lg:min-h-96">
            <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full border border-leaf/25 bg-leaf/10 px-2.5 py-1 text-[10px] font-bold tracking-wide text-leaf uppercase">
              <GraduationCap className="h-3.5 w-3.5" />
              Nuru Learning
            </span>
            <h1 className="font-display text-4xl leading-tight font-bold text-white sm:text-5xl">
              Rooted in Scripture.
              <br />
              Ready for everyday life.
            </h1>
            <p className="mt-2 text-[12px] leading-relaxed text-white/75">
              {FAITH_COURSES.length} Nuru courses and self-guided Scripture studies, plus{" "}
              {externalCourses.length} free BibleProject classes.
            </p>
            <a
              href="#course-catalogue"
              className="mt-5 inline-flex min-h-11 w-fit items-center gap-3 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Find your next course <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </section>

        {!query && !category && nativeVisible && format === "all" && (
          <section aria-labelledby="extended-course-heading">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-leaf">
                  Go deeper
                </p>
                <h2 id="extended-course-heading" className="mt-1 font-display text-2xl font-bold">
                  Faith for the life you live
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                12 new lessons · Practical exercises
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {FAITH_COURSES.filter((item) => item.extended).map((item) => (
                <Link
                  key={item.slug}
                  to="/faith-courses/$slug"
                  params={{ slug: item.slug }}
                  className="nuru-card group overflow-hidden transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <div className="relative h-40 overflow-hidden">
                    <CoverImage
                      src={resolveMedia(item.cover)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                    <span className="absolute bottom-4 left-4 rounded-full border border-white/25 bg-black/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      Extended course · {item.level}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-xl font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                    <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                      <span>
                        {item.lessons.length} lessons · {item.estimatedMinutes} min guided study
                      </span>
                      <ChevronRight className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div id="course-catalogue" className="scroll-mt-24 space-y-3">
          <h2 className="font-display text-2xl font-bold">Explore the library</h2>
          <p className="text-sm text-muted-foreground">
            Choose a practical course or take your time with a guided Scripture study.
          </p>
          <div className="flex flex-wrap gap-2" aria-label="Course format">
            {[
              ["all", "Everything"],
              ["extended", "Extended courses"],
              ["studies", "Scripture studies"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={format === value}
                onClick={() => {
                  setFormat(value!);
                  setVisibleCount(24);
                }}
                className={cn(
                  "min-h-11 rounded-xl border px-4 text-sm font-semibold",
                  format === value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(24);
            }}
            placeholder="Search baptism, prayer, relationships…"
            aria-label="Search Faith Courses"
            className="input-nuru pl-11"
          />
        </div>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button
            type="button"
            aria-pressed={category === null}
            onClick={() => {
              setCategory(null);
              setVisibleCount(24);
            }}
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold",
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
              aria-pressed={category === item}
              onClick={() => {
                setCategory(item);
                setVisibleCount(24);
              }}
              className={cn(
                "min-h-11 shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold",
                category === item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface-2 text-secondary-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </div>

        {!query && !category && nativeVisible && format === "all" && (
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
            onChange={(event) => {
              setProvider(event.target.value);
              setVisibleCount(24);
            }}
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
            {(nativeVisible ? filtered.slice(0, visibleCount) : []).map((item) => (
              <CourseRow key={item.slug} course={item} />
            ))}
          </div>
          {nativeVisible && visibleCount < filtered.length && (
            <button
              type="button"
              className="mt-4 min-h-11 rounded-xl border border-border px-5 text-sm font-semibold"
              onClick={() => setVisibleCount((count) => count + 24)}
            >
              Load more studies · {Math.min(visibleCount, filtered.length)} of {filtered.length}
            </button>
          )}
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
          <div className="nuru-card p-8 text-center" role="status">
            <BookOpen className="mx-auto mb-3 h-8 w-8 text-primary" />
            <p className="font-display text-lg font-semibold">No courses match these filters</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a broader topic, provider or course format.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory(null);
                setProvider("all");
                setFormat("all");
                setVisibleCount(24);
              }}
              className="mt-4 min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
            >
              Clear filters
            </button>
          </div>
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
          {course.category} · {course.guidedStudy ? "Guided Scripture study" : course.level}
        </span>
        <span className="mt-0.5 block font-display text-base leading-snug font-semibold">
          {course.title}
        </span>
        <span className="mt-1 hidden text-xs leading-relaxed text-muted-foreground sm:line-clamp-2">
          {course.description}
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
