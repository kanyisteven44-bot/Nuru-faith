import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export function ReadingQuickAccess() {
  return (
    <nav aria-label="Reading quick access" className="my-4">
      <Link
        to="/grow"
        className="nuru-card flex min-h-16 w-full items-center gap-3 px-4 py-3 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="nuru-soft-inset flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
          <GraduationCap className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Learning</span>
          <span className="block text-xs text-muted-foreground">
            Courses · Devotions · Scripture Series
          </span>
        </span>
      </Link>
    </nav>
  );
}
