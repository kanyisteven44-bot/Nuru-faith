import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

export function LearningLinks({ active }: { active: "Courses" | "Devotionals" | "Series" }) {
  return (
    <nav aria-label="Learning quick access" className="px-4 py-3">
      <Link
        to="/grow"
        aria-label={`Open Learning hub. Current section: ${active}`}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary"
      >
        <GraduationCap className="h-4 w-4" />
        Learning
        <span className="text-xs font-medium text-muted-foreground">
          Courses · Devotions · Series
        </span>
      </Link>
    </nav>
  );
}
