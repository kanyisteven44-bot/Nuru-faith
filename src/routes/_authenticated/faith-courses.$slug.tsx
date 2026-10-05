import { CoverImage } from "@/components/nuru/CoverImage";
import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Lightbulb,
  MessageCircleQuestion,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/nuru/AppShell";
import { Chip, ProgressBar } from "@/components/nuru/Primitives";
import { faithCourseBySlug } from "@/data/faithCourses";
import { resolveMedia } from "@/lib/media";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ReadingTools } from "@/components/nuru/ReadingTools";
import { fetchPassage, DEFAULT_TRANSLATION } from "@/lib/bible";

export const Route = createFileRoute("/_authenticated/faith-courses/$slug")({
  head: () => ({
    meta: [{ title: "Faith Course — Nuru Faith" }],
  }),
  component: FaithCourseDetail,
});

function FaithCourseDetail() {
  const { slug } = Route.useParams();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const course = faithCourseBySlug(slug);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  useEffect(() => setLessonIndex(0), [slug]);
  const progressQuery = useQuery({
    queryKey: ["faith-course-progress", userId, slug],
    enabled: !!userId && !!course,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faith_course_lesson_progress")
        .select("lesson_index")
        .eq("user_id", userId!)
        .eq("course_slug", slug);
      if (error) throw error;
      return new Set((data ?? []).map((row) => row.lesson_index));
    },
  });
  const done = progressQuery.data ?? new Set<number>();

  const progress = course ? Math.round((done.size / course.lessons.length) * 100) : 0;
  const lesson = course?.lessons[lessonIndex] ?? null;
  const scripture = useQueries({
    queries: (lesson?.references ?? []).map((reference) => ({
      queryKey: ["passage", reference, DEFAULT_TRANSLATION],
      queryFn: () => fetchPassage(reference, DEFAULT_TRANSLATION),
      staleTime: Infinity,
      retry: 1,
    })),
  });

  const teaching = useMemo(() => {
    if (!course || !lesson) return null;
    return {
      context: `${lesson.focus} Begin by reading the whole passage around ${lesson.references.join(
        " and ",
      )}, not only the quoted verse. Ask who is speaking, who is listening, what problem is being addressed, and what comes immediately before and after.`,
      meaning: `${course.description} In this lesson, the goal is not merely to collect information. Look for what the passage reveals about God's character, human motives, the work of Christ, and the kind of response Scripture calls faithful.`,
      practice: `Turn the lesson into one concrete response this week. Keep it specific enough to practise and small enough to repeat. Christian formation usually happens through faithful patterns over time, not one intense moment.`,
    };
  }, [course, lesson]);

  if (!course || !lesson || !teaching) {
    return (
      <AppShell>
        <div className="px-4 pt-8">
          <Link to="/faith-courses" className="inline-flex items-center gap-2 text-sm text-leaf">
            <ArrowLeft className="h-4 w-4" /> Faith Courses
          </Link>
          <div className="nuru-card mt-6 p-5">
            <h1 className="font-display text-xl font-bold">Course not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This course may have moved or is not available in this build.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  async function toggleDone(index: number) {
    if (!userId || saving || !progressQuery.isSuccess) return;
    setSaving(true);
    try {
      const request = done.has(index)
        ? supabase
            .from("faith_course_lesson_progress")
            .delete()
            .eq("user_id", userId)
            .eq("course_slug", slug)
            .eq("lesson_index", index)
        : supabase.from("faith_course_lesson_progress").insert({
            user_id: userId,
            course_slug: slug,
            lesson_index: index,
          });
      const { error } = await request;
      if (error) throw error;
      const next = new Set(done);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      queryClient.setQueryData(["faith-course-progress", userId, slug], next);
    } catch {
      toast.error("Could not save lesson progress. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="relative h-64 overflow-hidden">
        <CoverImage
          src={resolveMedia(course.cover)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/20" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <Link
            to="/faith-courses"
            aria-label="Back to Faith Courses"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Chip tone="brand">{course.level}</Chip>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="text-[10px] font-bold tracking-[0.15em] text-leaf uppercase">
            {course.category}
          </p>
          <h1 className="mt-1 max-w-[88%] font-display text-[28px] leading-tight font-bold text-white">
            {course.title}
          </h1>
          <p className="mt-2 flex items-center gap-2 text-[11px] text-white/75">
            <BookOpen className="h-3.5 w-3.5" />
            {course.lessons.length} lessons
            <span>•</span>
            <Clock3 className="h-3.5 w-3.5" />
            {course.estimatedMinutes} min
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-8">
        <section className="nuru-card p-4">
          <p className="text-sm leading-relaxed text-secondary-foreground">{course.description}</p>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-secondary-foreground">Course progress</span>
              <span className="text-leaf">{progress}%</span>
            </div>
            <ProgressBar value={progress} />
            {progressQuery.isError && (
              <p role="alert" className="mt-2 text-xs text-warning">
                Progress could not load. Check your connection and{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => void progressQuery.refetch()}
                >
                  try again
                </button>
                .
              </p>
            )}
          </div>
        </section>

        <details className="nuru-card p-4">
          <summary className="cursor-pointer font-display text-lg font-semibold">
            Course lessons · {lessonIndex + 1} of {course.lessons.length}
          </summary>
          <div className="space-y-2">
            {course.lessons.map((item, index) => {
              const active = index === lessonIndex;
              const completed = done.has(index);
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setLessonIndex(index)}
                  className={`nuru-card flex w-full items-center gap-3 px-3 py-3 text-left transition-colors ${
                    active ? "border-primary/70 bg-primary/8" : ""
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
                      completed
                        ? "border-growth/50 bg-growth/15 text-growth"
                        : active
                          ? "border-primary/60 bg-primary/15 text-leaf"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {completed ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold">{item.title}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                      {item.references.join(" · ")}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </details>

        <section className="nuru-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[10px] font-bold tracking-[0.14em] text-leaf uppercase">
              Lesson {lessonIndex + 1}
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold">{lesson.title}</h2>
            {course.guidedStudy && (
              <p className="mt-2 text-xs text-muted-foreground">
                Self-guided Scripture study · World English Bible
              </p>
            )}
          </div>

          <div className="p-4 sm:p-7">
            <ReadingTools
              fontSize={fontSize}
              onFontSize={setFontSize}
              text={
                scripture.some((passage) => passage.isPending)
                  ? ""
                  : [
                      lesson.title,
                      ...scripture.map((passage) => passage.data?.text ?? ""),
                      teaching.context,
                      teaching.meaning,
                      ...course.examples,
                      teaching.practice,
                    ].join("\n\n")
              }
            />
            <div className="nuru-reader-copy space-y-7" style={{ fontSize }}>
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-leaf" />
                  <h3 className="text-sm font-semibold">Read first</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lesson.references.map((reference) => (
                    <span
                      key={reference}
                      className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-leaf"
                    >
                      {reference}
                    </span>
                  ))}
                </div>
                {scripture.map((passage, index) => (
                  <div
                    key={lesson.references[index]}
                    className="mt-4 rounded-2xl border border-border bg-surface-2/40 p-4"
                  >
                    {passage.isPending ? (
                      <p role="status">Loading Scripture…</p>
                    ) : passage.isError ? (
                      <div role="alert">
                        <p>This passage could not load.</p>
                        <button
                          type="button"
                          className="min-h-11 text-sm text-primary underline"
                          onClick={() => void passage.refetch()}
                        >
                          Retry Scripture
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="mb-3 text-xs! font-semibold text-primary">
                          {passage.data?.reference} · {passage.data?.translation}
                        </p>
                        {passage.data?.verses.map((verse) => (
                          <p
                            key={`${verse.chapter}:${verse.verse}`}
                            className="mb-2 font-display leading-[1.85]"
                          >
                            <sup className="mr-2 text-xs text-muted-foreground">{verse.verse}</sup>
                            {verse.text}
                          </p>
                        ))}
                      </>
                    )}
                  </div>
                ))}
              </div>

              <LessonSection icon={Lightbulb} title="Context" body={teaching.context} />
              <LessonSection icon={Sparkles} title="What it means" body={teaching.meaning} />

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <MessageCircleQuestion className="h-4 w-4 text-leaf" />
                  <h3 className="text-sm font-semibold">Real-life examples</h3>
                </div>
                <ul className="space-y-2">
                  {course.examples.map((example) => (
                    <li
                      key={example}
                      className="flex gap-2 text-[13px] leading-relaxed text-secondary-foreground"
                    >
                      <Circle className="mt-1.5 h-2.5 w-2.5 shrink-0 fill-leaf text-leaf" />

                      {example}
                    </li>
                  ))}
                </ul>
              </div>

              <LessonSection
                icon={CheckCircle2}
                title="Put it into practice"
                body={teaching.practice}
              />

              <div className="rounded-2xl border border-border bg-surface-2 p-4">
                <p className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  Reflect
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-secondary-foreground">
                  What does this lesson reveal about God? What does it expose or encourage in your
                  own life? What is one faithful response you can practise before the next lesson?
                </p>
              </div>

              <button
                type="button"
                onClick={() => void toggleDone(lessonIndex)}
                disabled={!progressQuery.isSuccess || saving}
                className={`min-h-11 w-full rounded-xl text-sm font-semibold transition-colors ${
                  done.has(lessonIndex)
                    ? "border border-growth/50 bg-growth/12 text-growth"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {saving
                  ? "Saving…"
                  : progressQuery.isLoading
                    ? "Loading progress…"
                    : done.has(lessonIndex)
                      ? "Lesson completed ✓"
                      : "Mark lesson complete"}
              </button>
              {lessonIndex < course.lessons.length - 1 && (
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold"
                  onClick={() => setLessonIndex((index) => index + 1)}
                >
                  Next lesson <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function LessonSection({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Lightbulb;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-leaf" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="text-[13px] leading-relaxed text-secondary-foreground">{body}</p>
    </div>
  );
}
