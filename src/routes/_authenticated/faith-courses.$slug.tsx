import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
          <Link to="/faith-courses" className="inline-flex items-center gap-2 text-sm text-cyan">
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
        <img
          src={resolveMedia(course.cover)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-black/20" />
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
          <p className="text-[10px] font-bold tracking-[0.15em] text-cyan uppercase">
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

      <div className="space-y-5 px-4 py-5">
        <section className="nuru-card p-4">
          <p className="text-sm leading-relaxed text-secondary-foreground">{course.description}</p>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-secondary-foreground">Course progress</span>
              <span className="text-cyan">{progress}%</span>
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

        <section>
          <h2 className="mb-3 font-display text-[15px] font-semibold">Course lessons</h2>
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
                          ? "border-primary/60 bg-primary/15 text-cyan"
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
        </section>

        <section className="nuru-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[10px] font-bold tracking-[0.14em] text-cyan uppercase">
              Lesson {lessonIndex + 1}
            </p>
            <h2 className="mt-1 font-display text-xl font-bold">{lesson.title}</h2>
          </div>

          <div className="space-y-5 p-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-cyan" />
                <h3 className="text-sm font-semibold">Read first</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {lesson.references.map((reference) => (
                  <span
                    key={reference}
                    className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-cyan"
                  >
                    {reference}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Nuru's Bible reader currently uses the World English Bible. NIV wording is not
                copied into the app without publisher permission.
              </p>
            </div>

            <LessonSection icon={Lightbulb} title="Context" body={teaching.context} />
            <LessonSection icon={Sparkles} title="What it means" body={teaching.meaning} />

            <div>
              <div className="mb-2 flex items-center gap-2">
                <MessageCircleQuestion className="h-4 w-4 text-cyan" />
                <h3 className="text-sm font-semibold">Real-life examples</h3>
              </div>
              <ul className="space-y-2">
                {course.examples.map((example) => (
                  <li
                    key={example}
                    className="flex gap-2 text-[13px] leading-relaxed text-secondary-foreground"
                  >
                    <Circle className="mt-1.5 h-2.5 w-2.5 shrink-0 fill-cyan text-cyan" />
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
                What does this lesson reveal about God? What does it expose or encourage in your own
                life? What is one faithful response you can practise before the next lesson?
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
        <Icon className="h-4 w-4 text-cyan" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="text-[13px] leading-relaxed text-secondary-foreground">{body}</p>
    </div>
  );
}
