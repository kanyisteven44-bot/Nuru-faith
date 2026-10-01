import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfile } from "@/services/content";
import { Avatar } from "@/components/nuru/AppShell";

/**
 * Wordmark header used only by Devotionals and Series — a violet "Faith"
 * and a marketing tagline distinct from the rest of the app's BrandBar.
 * Sits on the same dark bg-background as everywhere else.
 */
export function FeatureHeaderBar({ right }: { right?: ReactNode }) {
  const { userId } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });

  return (
    <div className="flex items-start justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div>
        <span className="font-display text-xl font-bold text-white">
          Nuru <span className="text-[#a78bfa]">Faith</span>
        </span>
        <p className="mt-0.5 text-[11px] font-medium text-white/60">
          Real Faith. Brighter Days.<sup>&reg;</sup>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {right}
        <Link
          to="/notifications"
          aria-label="Notifications"
          className="relative rounded-full bg-white/10 p-2 text-white backdrop-blur-sm"
        >
          <Bell className="h-4.5 w-4.5" strokeWidth={1.8} />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#a78bfa]" />
        </Link>
        <Link to="/profile" aria-label="Your profile">
          <Avatar
            url={profile?.avatar_url ?? null}
            name={profile?.full_name ?? ""}
            seed={userId}
            size="sm"
            className="border-white/30"
          />
        </Link>
      </div>
    </div>
  );
}
