import { createFileRoute, redirect, lazyRouteComponent } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { rememberAfterLogin } from "@/lib/afterLogin";

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
    if (error || !user) {
      // Remember the exact original protected route, so after email or Google
      // sign-in a deep link (including Admin) opens where the user intended.
      if (typeof window !== "undefined") rememberAfterLogin(location.href, window.location.origin);
      throw redirect({ to: "/auth", search: { mode: "login" as const } });
    }

    // Keep first-time users inside one predictable setup flow no matter which
    // protected URL they open from a message, bookmark or shared link.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileError) {
      const needsOnboarding = !profile || profile.onboarded === false;
      if (needsOnboarding && location.pathname !== "/onboarding") {
        throw redirect({ to: "/onboarding" });
      }
      if (!needsOnboarding && location.pathname === "/onboarding") {
        throw redirect({ to: "/home" });
      }
    }

    // MFA is temporarily not enforced here. A valid Supabase session is still required.

    return { user };
  },
  // Route permissions load eagerly; realtime messaging and calling load only
  // after someone actually enters the authenticated part of Nuru.
  component: lazyRouteComponent(
    () => import("@/components/nuru/AuthenticatedLayout"),
    "AuthenticatedLayout",
  ),
});
