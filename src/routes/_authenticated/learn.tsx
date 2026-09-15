import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { resolveMedia } from "@/lib/media";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchCourseLessons,
  fetchCourses,
  fetchMyProgress,
  upsertProgress,
} from "@/services/content";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, Chip, EmptyState, ProgressBar } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/learn")({
  head: () => ({
    meta: [
      { title: "Learn — Nuru Faith" },
      {
        name: "description",
        content: "Courses on Scripture, church life, baptism and Christian living.",
      },
      { property: "og:title", content: "Learn — Nuru Faith" },
      { property: "og:description", content: "Courses on Scripture and Christian living." },
    ],
  }),
  component: LearnScreen,
});

function LearnScreen() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [openCourse, setOpenCourse] = useState<string | null>(null);

  const courses = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });
  const progress = useQuery({
    queryKey: ["progress", userId],
    queryFn: () => fetchMyProgress(userId!),
    enabled: !!userId,
  });
  const lessons = useQuery({
    queryKey: ["lessons", openCourse],
    queryFn: () => fetchCourseLessons(openCourse!),
    enabled: !!openCourse,
  });

  const done = (courseId: string) =>
    progress.data?.find((p) => p.course_id === courseId)?.completed_lessons ?? 0;

  async function mark(courseId: string, count: number, total: number) {
    if (!userId) return;
    try {
      await upsertProgress(userId, courseId, count, total);
      await queryClient.invalidateQueries({ queryKey: ["progress", userId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save progress");
    }
  }

  return (
    <AppShell>
      <ScreenHeader title="Learn" subtitle="Grow in understanding, step by step" />

      <div className="space-y-3 px-4 py-3">
        {courses.isLoading && <CardSkeleton count={3} height="h-28" />}
        {courses.data?.length === 0 && (
          <EmptyState title="No courses yet" description="Teaching series are being prepared." />
        )}
        {(courses.data ?? []).map((c) => {
          const open = openCourse === c.id;
          const completed = done(c.id);
          const total = c.lesson_count ?? 0;
          const pct = total ? Math.round((completed / total) * 100) : 0;
          return (
            <article key={c.id} className="nuru-card overflow-hidden">
              <div className="flex gap-3 p-3">
                <img
                  src={resolveMedia(c.cover_url)}
                  alt=""
                  width={160}
                  height={160}
                  loading="lazy"
                  className="h-20 w-20 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{c.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
                  <div className="mt-1.5 flex gap-1.5">
                    <Chip tone="brand">{c.category}</Chip>
                    <Chip>{total} lessons</Chip>
                  </div>
                </div>
              </div>

              <div className="px-3">
                <ProgressBar value={pct} label={`${pct}% complete`} />
              </div>

              <button
                onClick={() => setOpenCourse(open ? null : c.id)}
                aria-expanded={open}
                className="min-h-11 px-3 pb-3 pt-2 text-xs font-semibold text-cyan"
              >
                {open ? "Hide lessons" : completed > 0 ? "Continue course" : "Start course"}
              </button>

              {open && (
                <ol className="space-y-2 border-t border-border/60 p-3">
                  {lessons.isLoading && <CardSkeleton count={3} height="h-12" />}
                  {(lessons.data ?? []).map((l, i) => {
                    const isDone = i < completed;
                    return (
                      <li key={l.id}>
                        <button
                          onClick={() =>
                            mark(c.id, isDone ? i : i + 1, total || (lessons.data?.length ?? 0))
                          }
                          className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface-2 p-3 text-left hover:border-border-strong"
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-growth" />
                          ) : (
                            <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">{l.title}</span>
                            {l.content && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {l.content}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
