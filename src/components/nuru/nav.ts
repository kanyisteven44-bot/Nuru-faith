import {
  BookOpen,
  CalendarDays,
  Church,
  Clapperboard,
  Compass,
  FileText,
  GraduationCap,
  Home,
  MoreHorizontal,
  Music2,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * One navigation definition for the whole app, so the sidebar and the bar
 * never drift apart between screens. Taken from the Home concept board.
 */
export type NavLink = { to: string; label: string; icon: LucideIcon };

export const SIDEBAR_GROUPS: { heading: string; items: NavLink[] }[] = [
  {
    heading: "Discover",
    items: [
      { to: "/home", label: "Home", icon: Home },
      { to: "/explore", label: "Explore", icon: Compass },
      { to: "/reels", label: "Reels", icon: Clapperboard },
      { to: "/music", label: "Music", icon: Music2 },
    ],
  },
  {
    heading: "Grow in faith",
    items: [
      { to: "/bible", label: "Bible", icon: BookOpen },
      { to: "/devotionals", label: "Devotionals", icon: FileText },
      { to: "/faith-courses", label: "Courses", icon: GraduationCap },
    ],
  },
  {
    heading: "Together",
    items: [
      { to: "/community", label: "Community", icon: Users },
      { to: "/church", label: "My Church", icon: Church },
      { to: "/mentors", label: "Mentorship", icon: Users },
      { to: "/events", label: "Events", icon: CalendarDays },
    ],
  },
];

/** The board's five-item bar. "More" is the existing /hub index. */
export const MOBILE_NAV: NavLink[] = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/community", label: "Community", icon: Users },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/hub", label: "More", icon: MoreHorizontal },
];
