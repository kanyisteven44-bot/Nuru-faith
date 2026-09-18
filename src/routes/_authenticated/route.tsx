import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // This route is client-only. Restore the persisted session first so a slow
    // auth-network round trip cannot bounce a signed-in person away from /reels.
    // Protected data/server functions still validate the access token themselves.
    const { data, error } = await supabase.auth.getSession();
    const user = data.session?.user ?? null;
    if (error || !user) throw redirect({ to: "/auth", search: { mode: "login" as const } });
    return { user };
  },
  component: () => <Outlet />,
});
