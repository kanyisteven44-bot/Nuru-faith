import { assertSuperAdmin, assertAdminWriteAssurance } from "@/lib/adminDirectoryAccess";
import { createServerFn } from "@tanstack/react-start";
import { createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const requireSuperAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ context, next }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    assertSuperAdmin(data, !!error);
    return next({ context });
  });

export const getAdminDirectory = createServerFn({ method: "GET" })
  .middleware([requireSuperAdmin])
  .validator(
    z.object({ page: z.number().int().min(0).default(0), churchId: z.string().uuid().optional() }),
  )
  .handler(async ({ data, context }) => {
    // Query as the caller: existing RLS controls membership visibility.
    const start = data.page * 25;
    const [users, churches, mentors, conversations] = await Promise.all([
      context.supabase.from("profiles").select("id", { count: "exact", head: true }),
      context.supabase.from("churches").select("id", { count: "exact", head: true }),
      context.supabase.from("mentors").select("id", { count: "exact", head: true }),
      // Only an aggregate count leaves the server; conversation contents are never read.
      (async () => {
        if (!process.env["SUPABASE_SERVICE_ROLE_KEY"]) return { count: null };
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const result = await supabaseAdmin
            .from("ai_conversations")
            .select("id", { count: "exact", head: true });
          return { count: result.error ? null : result.count };
        } catch {
          return { count: null };
        }
      })(),
    ]);
    for (const response of [users, churches, mentors])
      if (response.error) throw new Error(response.error.message);
    if (data.churchId) {
      const members = await context.supabase
        .from("church_members")
        .select("id, user_id, created_at", { count: "exact" })
        .eq("church_id", data.churchId)
        .order("created_at")
        .order("id")
        .range(start, start + 24);
      if (members.error) throw new Error(members.error.message);
      const profiles = members.data?.length
        ? await context.supabase
            .from("profiles")
            .select("id, full_name, username")
            .in(
              "id",
              members.data.map((m) => m.user_id),
            )
        : { data: [], error: null };
      if (profiles.error) throw new Error(profiles.error.message);
      return {
        counts: {
          users: users.count,
          churches: churches.count,
          mentors: mentors.count,
          aiConversations: conversations.count,
        },
        total: members.count ?? 0,
        people: profiles.data ?? [],
      };
    }
    const profiles = await context.supabase
      .from("profiles")
      .select("id, full_name, username", { count: "exact" })
      .order("created_at")
      .order("id")
      .range(start, start + 24);
    if (profiles.error) throw new Error(profiles.error.message);
    return {
      counts: {
        users: users.count,
        churches: churches.count,
        mentors: mentors.count,
        aiConversations: conversations.count,
      },
      total: profiles.count ?? 0,
      people: profiles.data ?? [],
    };
  });

const churchInput = z.object({
  kind: z.literal("church"),
  name: z.string().trim().min(2).max(150),
  city: z.string().trim().max(100),
  denomination: z.string().trim().max(100),
});
const mentorInput = z.object({
  kind: z.literal("mentor"),
  name: z.string().trim().min(2).max(150),
  churchId: z.string().uuid().optional(),
  userId: z.string().uuid(),
  bio: z.string().trim().min(20).max(3000),
  specialties: z.array(z.string().trim().min(1).max(80)).min(1).max(10),
});
export const createAdminDirectoryEntry = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .validator(z.discriminatedUnion("kind", [churchInput, mentorInput]))
  .handler(async ({ data, context }) => {
    assertAdminWriteAssurance(context.claims.aal);
    if (data.kind === "church") {
      const slug = `${
        data.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "church"
      }-${crypto.randomUUID().slice(0, 8)}`;
      const result = await context.supabase
        .from("churches")
        .insert({
          name: data.name,
          slug,
          city: data.city || null,
          denomination: data.denomination || null,
          verified: false,
        })
        .select("id")
        .single();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    }
    // Use the authenticated client; the mentor insert policy independently
    // requires Super Admin, AAL2 and an unverified existing member profile.
    const supabaseAdmin = context.supabase;
    const existing = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", data.userId)
      .maybeSingle();
    if (existing.error || !existing.data)
      throw new Error("Select an existing Nuru member for this mentor.");
    const duplicate = await supabaseAdmin
      .from("mentors")
      .select("id")
      .eq("user_id", data.userId)
      .limit(1);
    if (duplicate.error) throw new Error(duplicate.error.message);
    if (duplicate.data?.length) throw new Error("This member already has a mentor profile.");
    const result = await supabaseAdmin
      .from("mentors")
      .insert({
        display_name: data.name,
        user_id: data.userId,
        church_id: data.churchId ?? null,
        bio: data.bio,
        specialties: data.specialties,
        verified: false,
      })
      .select("id")
      .single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });
