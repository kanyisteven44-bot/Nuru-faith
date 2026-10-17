import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const sections = [
  { label: "Courses", to: "/faith-courses", value: "Courses" },
  { label: "Devotions", to: "/devotionals", value: "Devotionals" },
  { label: "Series", to: "/series", value: "Series" },
] as const;

export function LearningLinks({ active }: { active: "Courses" | "Devotionals" | "Series" }) {
  return (
    <nav aria-label="Learning quick access" className="px-4 py-3">
      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-surface-2 p-1">
        {sections.map(({ label, to, value }) => (
          <Link
            key={to}
            to={to}
            aria-current={active === value ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center justify-center rounded-xl px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active === value
                ? "bg-surface text-primary shadow-sm"
                : "text-ink-2 hover:bg-surface hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
