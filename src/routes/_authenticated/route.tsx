import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { CallManager } from "@/components/nuru/CallManager";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
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

    // MFA is temporarily not enforced here. A valid Supabase session is still required.

    return { user };
  },
  component: () => (
    <CallManager>
      <Outlet />
    </CallManager>
  ),
});
