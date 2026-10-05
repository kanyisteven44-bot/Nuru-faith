import { Link } from "@tanstack/react-router";
import { BookOpen, GraduationCap, Sparkles } from "lucide-react";

export function ReadingQuickAccess() {
  return (
    <nav aria-label="Reading quick access" className="my-4 grid grid-cols-3 gap-2">
      {(
        [
          { to: "/faith-courses", label: "Courses", icon: GraduationCap },
          { to: "/devotionals", label: "Devotions", icon: Sparkles },
          { to: "/series", label: "Series", icon: BookOpen },
        ] as const
      ).map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeProps={{ "aria-current": "page", className: "border-primary bg-primary/10" }}
          className="nuru-card flex min-h-16 items-center justify-center gap-2 px-2 py-3 text-sm font-semibold hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Icon className="h-4 w-4 text-primary" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
