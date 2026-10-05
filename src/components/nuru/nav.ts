import {
  BookOpen,
  CalendarDays,
  Church,
  Clapperboard,
  Compass,
  GraduationCap,
  Home,
  MessageCircle,
  Music2,
  Search,
  Sparkles,
  User,
  UserRoundCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * One navigation definition for the whole app, so the rail and the bar can
 * never drift apart.
 */
export type NavLink = { to: string; label: string; icon: LucideIcon };

/** The five primary destinations, as the designs lay them out. */
export const MOBILE_NAV: NavLink[] = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/bible", label: "Bible", icon: BookOpen },
  { to: "/explore", label: "Search", icon: Search },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
];

/**
 * Desktop keeps those five at the top, then exposes the rest of the app that
 * mobile reaches through in-page links.
 */
export const SIDEBAR_GROUPS: { heading: string; items: NavLink[] }[] = [
  { heading: "", items: MOBILE_NAV },
  {
    heading: "Grow",
    items: [
      { to: "/grow", label: "Learning", icon: GraduationCap },
      { to: "/books", label: "Christian Books", icon: BookOpen },
      { to: "/ai", label: "Ask Nuru", icon: Sparkles },
    ],
  },
  {
    heading: "Together",
    items: [
      { to: "/community", label: "Community", icon: Users },
      { to: "/church", label: "My Church", icon: Church },
      // Distinct from Pray's HandHeart — the two read as the same glyph at
      // nav size, which the brief calls out as an inconsistency to fix.
      { to: "/mentors", label: "Mentorship", icon: UserRoundCheck },
      { to: "/events", label: "Events", icon: CalendarDays },
    ],
  },
  {
    heading: "Media",
    items: [
      { to: "/reels", label: "Reels", icon: Clapperboard },
      { to: "/music", label: "Music", icon: Music2 },
      { to: "/explore", label: "Explore", icon: Compass },
    ],
  },
];
