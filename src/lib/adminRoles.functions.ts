import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminWriteAssurance, assertSuperAdmin } from "@/lib/adminDirectoryAccess";

const roleSchema = z.enum(["super_admin", "moderator", "church_admin"]);

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

export const getAdminRoleAssignments = createServerFn({ method: "GET" })
  .middleware([requireSuperAdmin])
  .handler(async ({ context }) => {
    const roles = await context.supabase
      .from("user_roles")
      .select("id,user_id,role,church_id,created_at")
      .order("created_at", { ascending: false })
      .limit(250);
    if (roles.error) throw new Error(roles.error.message);

    const userIds = [...new Set((roles.data ?? []).map((row) => row.user_id))];
    const churchIds = [
      ...new Set((roles.data ?? []).map((row) => row.church_id).filter(Boolean) as string[]),
    ];

    const [profiles, churches] = await Promise.all([
      userIds.length
        ? context.supabase
            .from("profiles")
            .select("id,full_name,username,avatar_url")
            .in("id", userIds)
        : Promise.resolve({ data: [], error: null }),
      churchIds.length
        ? context.supabase.from("churches").select("id,name").in("id", churchIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (profiles.error) throw new Error(profiles.error.message);
    if (churches.error) throw new Error(churches.error.message);

    const profileMap = new Map((profiles.data ?? []).map((row) => [row.id, row]));
    const churchMap = new Map((churches.data ?? []).map((row) => [row.id, row.name]));

    return (roles.data ?? []).map((row) => ({
      ...row,
      person: profileMap.get(row.user_id) ?? null,
      church_name: row.church_id ? (churchMap.get(row.church_id) ?? null) : null,
    }));
  });

export const addAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .validator(
    z.object({
      userId: z.string().uuid(),
      role: roleSchema,
      churchId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    assertAdminWriteAssurance(context.claims.aal);

    const profile = await context.supabase
      .from("profiles")
      .select("id")
      .eq("id", data.userId)
      .maybeSingle();
    if (profile.error || !profile.data) throw new Error("Choose an existing Nuru member.");

    if (data.role === "church_admin" && !data.churchId) {
      throw new Error("Choose the church this administrator manages.");
    }

    const duplicateBase = context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", data.userId)
      .eq("role", data.role);
    const existing =
      data.role === "church_admin"
        ? await duplicateBase.eq("church_id", data.churchId!).limit(1)
        : await duplicateBase.is("church_id", null).limit(1);
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data?.length) throw new Error("That role is already assigned.");

    const inserted = await context.supabase
      .from("user_roles")
      .insert({
        user_id: data.userId,
        role: data.role,
        church_id: data.role === "church_admin" ? data.churchId! : null,
      })
      .select("id")
      .single();
    if (inserted.error) throw new Error(inserted.error.message);
    return inserted.data;
  });

export const removeAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .validator(z.object({ assignmentId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    assertAdminWriteAssurance(context.claims.aal);

    const assignment = await context.supabase
      .from("user_roles")
      .select("id,user_id,role")
      .eq("id", data.assignmentId)
      .maybeSingle();
    if (assignment.error || !assignment.data) throw new Error("Role assignment not found.");

    if (assignment.data.role === "super_admin") {
      if (assignment.data.user_id === context.userId) {
        throw new Error("You cannot remove your own Super Admin access.");
      }
      const remaining = await context.supabase
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "super_admin");
      if (remaining.error) throw new Error(remaining.error.message);
      if ((remaining.count ?? 0) <= 1) throw new Error("Nuru must keep at least one Super Admin.");
    }

    const deleted = await context.supabase.from("user_roles").delete().eq("id", data.assignmentId);
    if (deleted.error) throw new Error(deleted.error.message);
    return { ok: true };
  });
