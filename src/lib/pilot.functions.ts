import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PilotMetrics } from "@/services/pilot";

export const getPilotMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PilotMetrics> => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    if (
      roleError ||
      !roles?.some((row) => row.role === "moderator" || row.role === "super_admin")
    ) {
      throw new Error("Staff access required");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("get_nuru_pilot_metrics");

    if (error) throw new Error(error.message);
    return data as unknown as PilotMetrics;
  });
