import { Link } from "@tanstack/react-router";
import { BookOpen, GraduationCap, Library } from "lucide-react";

export function LearningLinks({ active }: { active: "Courses" | "Devotionals" | "Series" }) {
  return (
    <nav aria-label="Learning quick access" className="flex flex-wrap gap-2 px-4 py-3">
      {[
        { label: "Courses", to: "/faith-courses", icon: GraduationCap },
        { label: "Devotionals", to: "/devotionals", icon: BookOpen },
        { label: "Series", to: "/series", icon: Library },
      ].map(({ label, to, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          aria-current={active === label ? "page" : undefined}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${active === label ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-foreground"}`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
