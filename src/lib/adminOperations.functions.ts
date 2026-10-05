import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const overviewSchema = z.object({
  people: z.number(),
  churches: z.number(),
  churches_with_members: z.number(),
  memberships: z.number(),
  mentors: z.number(),
  verified_mentors: z.number(),
  ai_questions_30d: z.number(),
  ai_topics: z.array(z.object({ topic: z.string(), questions: z.number() })),
  church_members: z.array(z.object({ church_id: z.string().uuid(), members: z.number() })),
});

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "super_admin");
    if (error || !data?.length) throw new Error("Super-admin access required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.rpc("get_nuru_admin_overview");
    if (result.error) throw new Error("The operations report could not load.");
    return overviewSchema.parse(result.data);
  });
