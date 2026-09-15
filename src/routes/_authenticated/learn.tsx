import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, GraduationCap, Search } from "lucide-react";
import { resolveMedia } from "@/lib/media";
import { useAuth } from "@/hooks/useAuth";
import { fetchCourses, fetchMyProgress } from "@/services/content";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, PillTabs, ProgressBar } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/learn")({
  head: () => ({
    meta: [
      { title: "Courses & Series — Nuru Faith" },
      {
        name: "description",
        content: "Short Christian courses on discipleship, faith and life skills.",
      },
    ],
  }),
  component: LearnScreen,
});

const TABS = ["All", "Youth", "Discipleship", "Life Skills"] as const;
type Tab = (typeof TABS)[number];

function LearnScreen() {
  const { userId } = useAuth();
  const [tab, setTab] = useState<Tab>("All");

  const courses = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });
  const progress = useQuery({
    queryKey: ["course-progress", userId],
    queryFn: () => fetchMyProgress(userId!),
    enabled: !!userId,
  });

  const byCourse = new Map((progress.data ?? []).map((p) => [p.course_id, p] as const));
  const rows = (courses.data ?? []).filter(
    (c) => tab === "All" || (c.category ?? "").toLowerCase() === tab.toLowerCase(),
  );

  return (
    <AppShell>
      <ScreenHeader
        title="Courses & Series"
        right={
          <Link
            to="/explore"
            search={{ q: "", kind: "courses" }}
            aria-label="Search courses"
            className="p-1 text-secondary-foreground"
          >
            <Search className="h-5 w-5" />
          </Link>
        }
      />

      <div className="px-4 pb-1">
        <PillTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      <div className="space-y-2 px-4 pt-2">
        {courses.isLoading && <CardSkeleton count={4} height="h-20" />}
        {!courses.isLoading && rows.length === 0 && (
          <EmptyState
            title="No courses here yet"
            description="New teaching series are added regularly."
          />
        )}
        {rows.map((c) => {
          const done = byCourse.get(c.id)?.completed_lessons ?? 0;
          const total = c.lesson_count || 0;
          return (
            <Link
              key={c.id}
              to="/series"
              className="nuru-card flex items-center gap-3 p-3"
              aria-label={c.title}
            >
              {c.cover_url ? (
                <img
                  src={resolveMedia(c.cover_url)}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-primary/12 text-cyan">
                  <GraduationCap className="h-6 w-6" strokeWidth={1.7} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{c.title}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {total ? `${total} Lessons` : "Series"}
                </span>
                {done > 0 && total > 0 && (
                  <ProgressBar value={(done / total) * 100} className="mt-1.5" />
                )}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
