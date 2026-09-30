import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfile } from "@/services/content";
import { Avatar } from "@/components/nuru/AppShell";

/**
 * Header for Devotionals and Series.
 *
 * Design system v2 gives every screen the same header — the plain "NURU"
 * wordmark on the left and the signed-in person's avatar on the right — so
 * this no longer carries its own violet wordmark and tagline. It keeps its
 * own component because both callers pass a `right` slot.
 */
export function FeatureHeaderBar({ right }: { right?: ReactNode }) {
  const { userId } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-background/90 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
      <Link to="/home" aria-label="Nuru Faith">
        <span className="font-display text-[20px] leading-none tracking-[0.16em]">NURU</span>
      </Link>
      <div className="flex shrink-0 items-center gap-3">
        {right}
        <Link to="/profile" aria-label="Your profile">
          <Avatar
            url={profile?.avatar_url ?? null}
            name={profile?.full_name ?? ""}
            seed={userId}
            size="sm"
            className="h-9 w-9"
          />
        </Link>
      </div>
    </header>
  );
}
