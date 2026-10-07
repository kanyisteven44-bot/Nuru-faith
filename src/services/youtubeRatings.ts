import { supabase } from "@/integrations/supabase/client";
export const YOUTUBE_CONNECT_KEY = "nuru_youtube_connect";
export { YouTubeConnectionRequired } from "@/lib/youtubeRatingClient";
import { youtubeRatingRequest } from "@/lib/youtubeRatingClient";
async function request(videoId: string, rating?: "like" | "none") {
  const { data } = await supabase.auth.getSession();
  return youtubeRatingRequest(videoId, data.session?.provider_token, rating);
}
export const getYouTubeRating = (videoId: string) => request(videoId);
export const setYouTubeRating = (videoId: string, rating: "like" | "none") =>
  request(videoId, rating);
export async function connectYouTube(videoId: string) {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) throw new Error("Sign in to connect YouTube.");
  sessionStorage.setItem(YOUTUBE_CONNECT_KEY, JSON.stringify({ userId: user.id, videoId }));
  const options = {
    scopes: "https://www.googleapis.com/auth/youtube.force-ssl",
    redirectTo: `${window.location.origin}/auth-callback`,
    queryParams: { prompt: "consent", ...(user.email ? { login_hint: user.email } : {}) },
    skipBrowserRedirect: true,
  };
  // Existing Google identities renew consent; other identities are linked to
  // the current Nuru account, never silently replaced by another account.
  const result = user.identities?.some((i) => i.provider === "google")
    ? await supabase.auth.signInWithOAuth({ provider: "google", options })
    : await supabase.auth.linkIdentity({ provider: "google", options });
  if (result.error || !result.data.url) {
    sessionStorage.removeItem(YOUTUBE_CONNECT_KEY);
    throw new Error("YouTube connection is unavailable. Please try again later.");
  }
  window.location.assign(result.data.url);
}
