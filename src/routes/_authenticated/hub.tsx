import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarDays,
  Church,
  Clapperboard,
  GraduationCap,
  HandHeart,
  Headphones,
  Music,
  Sparkles,
  Users,
} from "lucide-react";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { IconTile, ScreenHero, SectionHeader } from "@/components/nuru/Primitives";
import { TAGLINE } from "@/constants/nuru";
import heroBg from "@/assets/quiet-night.jpg";

export const Route = createFileRoute("/_authenticated/hub")({
  head: () => ({
    meta: [
      { title: "Nuru Faith Hub" },
      {
        name: "description",
        content: "Every part of Nuru Faith in one place — Bible, community, learning and more.",
      },
      { property: "og:title", content: "Nuru Faith Hub" },
      { property: "og:description", content: "Every part of Nuru Faith in one place." },
    ],
  }),
  component: HubScreen,
});

const GROUPS = [
  {
    title: "Grow",
    items: [
      { to: "/bible", label: "Bible & devotionals", icon: BookOpen },
      { to: "/learn", label: "Courses", icon: GraduationCap },
      { to: "/ai", label: "Nuru AI", icon: Sparkles },
    ],
  },
  {
    title: "Belong",
    items: [
      { to: "/community", label: "Community", icon: Users },
      { to: "/church", label: "My Church", icon: Church },
      { to: "/mentors", label: "Mentorship", icon: Sparkles },
    ],
  },
  {
    title: "Experience",
    items: [
      { to: "/reels", label: "Short teachings", icon: Clapperboard },
      { to: "/music", label: "Worship music", icon: Music },
      { to: "/podcasts", label: "Podcasts", icon: Headphones },
    ],
  },
  {
    title: "Go",
    items: [
      { to: "/events", label: "Events", icon: CalendarDays },
      { to: "/serve", label: "Serve", icon: HandHeart },
    ],
  },
] as const;

function HubScreen() {
  return (
    <AppShell>
      <ScreenHeader title="Nuru Faith Hub" subtitle={TAGLINE} />
      <ScreenHero image={heroBg} />
      <div className="space-y-7 px-4 py-4">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <SectionHeader title={g.title} />
            <div className="grid grid-cols-2 gap-2.5">
              {g.items.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="nuru-card flex min-h-[92px] flex-col justify-between p-3.5 transition-transform active:scale-[0.98]"
                >
                  <IconTile icon={Icon} tone="brand" />
                  <span className="text-sm font-semibold">{label}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
