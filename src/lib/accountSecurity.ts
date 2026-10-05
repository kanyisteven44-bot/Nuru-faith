import { supabase } from "@/integrations/supabase/client";

export type MfaRequirement = "none" | "challenge" | "setup";

const STAFF_ROLES = new Set(["super_admin", "moderator", "church_admin"]);

export function newPasswordError(password: string): string | null {
  if (password.length < 12) return "Use at least 12 characters";
  if (password.length > 72) return "Password is too long";
  if (!/[a-z]/.test(password)) return "Add at least one lowercase letter";
  if (!/[A-Z]/.test(password)) return "Add at least one uppercase letter";
  if (!/[0-9]/.test(password)) return "Add at least one number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Add at least one symbol";
  return null;
}

export async function getMfaRequirement(): Promise<MfaRequirement> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  if (!user) return "none";

  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError) throw assuranceError;

  if (assurance.nextLevel === "aal2" && assurance.currentLevel !== "aal2") {
    return "challenge";
  }

  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (rolesError) throw rolesError;

  const isStaff = (roles ?? []).some((row) => STAFF_ROLES.has(String(row.role)));
  if (!isStaff) return "none";

  const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();
  if (factorError) throw factorError;
  const hasVerifiedTotp = factors.totp.some((factor) => factor.status === "verified");

  return hasVerifiedTotp ? "none" : "setup";
}
