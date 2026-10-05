import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** TURN credentials stay out of the public bundle and are provided only to signed-in callers. */
export const getCallIceServers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const servers: RTCIceServer[] = [
      { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    ];
    const urls = (process.env["TURN_URLS"] ?? "")
      .split(",")
      .map((url) => url.trim())
      .filter((url) => /^turns?:/.test(url));
    const username = process.env["TURN_USERNAME"];
    const credential = process.env["TURN_CREDENTIAL"];
    if (urls.length && username && credential) servers.push({ urls, username, credential });
    return servers;
  });
