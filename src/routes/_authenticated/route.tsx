import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { MessageAlerts } from "@/components/nuru/MessageAlerts";
import { CallManager } from "@/components/nuru/CallManager";
import { AppFrameSkeleton } from "@/components/nuru/AppFrameSkeleton";
import { supabase } from "@/integrations/supabase/client";

const ONBOARDED_KEY = "nuru:onboarded";
const onboardedUsers = new Set<string>();

function isKnownOnboarded(userId: string): boolean {
  if (onboardedUsers.has(userId)) return true;
  try {
    if (localStorage.getItem(ONBOARDED_KEY) === userId) {
      onboardedUsers.add(userId);
      return true;
    }
  } catch {
    // Storage blocked (private mode etc.): fall back to the network check.
  }
  return false;
}

function rememberOnboarded(userId: string) {
  onboardedUsers.add(userId);
  try {
    localStorage.setItem(ONBOARDED_KEY, userId);
  } catch {
    // Memory cache still covers this session.
  }
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  beforeLoad: async ({ location }) => {
    // Design-preview escape hatch, for screenshotting screens against real
    // components and real data without a session (see scripts/ui-shots.mjs).
    // `import.meta.env.DEV` is statically false in a production build, so the
    // whole branch is eliminated at build time and can never ship.
    if (import.meta.env.DEV && import.meta.env["VITE_PREVIEW_BYPASS"]) {
      return { user: null as never };
    }
    // This route is client-only. Restore the persisted session first so a slow
    // auth-network round trip cannot bounce a signed-in person away from /reels.
    // Protected data/server functions still validate the access token themselves.
    const { data, error } = await supabase.auth.getSession();
    const user = data.session?.user ?? null;
    if (error || !user) throw redirect({ to: "/auth", search: { mode: "login" as const } });

    // Keep first-time users inside one predictable setup flow no matter which
    // protected URL they open from a message, bookmark or shared link.
    // Onboarding only ever completes, so once a person is known to be
    // onboarded the check is skipped: otherwise every screen (and every
    // navigation) waits on this network round trip before it can render.
    let needsOnboarding: boolean | null = isKnownOnboarded(user.id) ? false : null;
    if (needsOnboarding === null) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", user.id)
        .maybeSingle();
      if (!profileError) {
        needsOnboarding = !profile || profile.onboarded === false;
        if (!needsOnboarding) rememberOnboarded(user.id);
      }
    }

    if (needsOnboarding === true && location.pathname !== "/onboarding") {
      throw redirect({ to: "/onboarding" });
    }
    if (needsOnboarding === false && location.pathname === "/onboarding") {
      throw redirect({ to: "/home" });
    }

    // MFA is temporarily not enforced here. A valid Supabase session is still required.

    return { user };
  },
  // Server-rendered in place of these client-only screens, so the first paint
  // is the app frame rather than a blank page.
  pendingComponent: AppFrameSkeleton,
  component: () => (
    <CallManager>
      <MessageAlerts />
      <Outlet />
    </CallManager>
  ),
});
