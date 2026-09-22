import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type NuruRateLimitAction = "ai" | "youtube_search" | "discovery_search";

export async function enforceNuruRateLimit(
  supabase: SupabaseClient<Database>,
  action: NuruRateLimitAction,
  message: string,
): Promise<void> {
  const { error } = await supabase.rpc("consume_nuru_rate_limit", { p_action: action });

  if (!error) return;

  if (
    error.message.includes("RATE_LIMITED") ||
    error.details?.includes("Too many requests")
  ) {
    throw new Error(message);
  }

  console.error("[rate-limit] protection check failed", {
    action,
    code: error.code,
    message: error.message,
  });
  throw new Error("Request protection is temporarily unavailable. Please try again shortly.");
}
