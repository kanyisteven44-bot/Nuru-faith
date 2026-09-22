import { supabase } from "@/integrations/supabase/client";

const ACTIVITY_KEY = "nuru_activity_ping_at";
const ACTIVITY_INTERVAL_MS = 15 * 60_000;

export type PilotMetrics = {
  profiles: number;
  onboarded: number;
  active_today: number;
  active_7d: number;
  active_30d: number;
  activated_users: number;
  reel_viewers: number;
  following_users: number;
  post_authors: number;
  mentorship_requesters: number;
  push_enabled_users: number;
};

export async function recordNuruActivity(): Promise<void> {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const previous = Number(window.localStorage.getItem(ACTIVITY_KEY) ?? "0");
  if (Number.isFinite(previous) && now - previous < ACTIVITY_INTERVAL_MS) return;

  const { error } = await supabase.rpc("record_nuru_activity");
  if (error) {
    console.warn("[pilot] activity heartbeat failed", error.message);
    return;
  }

  window.localStorage.setItem(ACTIVITY_KEY, String(now));
}

