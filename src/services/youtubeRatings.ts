import { supabase } from "@/integrations/supabase/client";
export const YOUTUBE_CONNECT_KEY = "nuru_youtube_connect";
export { YouTubeConnectionRequired } from "@/lib/youtubeRatingClient";
import { youtubeRatingRequest, youtubeCommentRequest } from "@/lib/youtubeRatingClient";
async function request(videoId: string, rating?: "like" | "none") {
  const { data } = await supabase.auth.getSession();
  return youtubeRatingRequest(videoId, data.session?.provider_token, rating);
}
export const getYouTubeRating = (videoId: string) => request(videoId);
export const setYouTubeRating = (videoId: string, rating: "like" | "none") =>
  request(videoId, rating);
export async function postYouTubeComment(videoId: string, channelId: string, text: string) {
  const { data } = await supabase.auth.getSession();
  return youtubeCommentRequest(videoId, channelId, text, data.session?.provider_token);
}
export async function connectYouTube(videoId: string, returnTo: "/reels" | "/music" = "/reels") {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) throw new Error("Sign in to connect YouTube.");
  sessionStorage.setItem(
    YOUTUBE_CONNECT_KEY,
    JSON.stringify({ userId: user.id, videoId, returnTo }),
  );
  const options = {
    scopes: "https://www.googleapis.com/auth/youtube.force-ssl",
    redirectTo: `${window.location.origin}/auth-callback`,
    queryParams: { prompt: "consent select_account" },
    skipBrowserRedirect: true,
  };
  // Link the selected Google identity to the existing user. Google may use a
  // different email; the Nuru user id must stay unchanged throughout OAuth.
  const result = await supabase.auth.linkIdentity({ provider: "google", options });
  if (result.error || !result.data.url) {
    sessionStorage.removeItem(YOUTUBE_CONNECT_KEY);
    if (result.error?.code === "manual_linking_disabled") {
      throw new Error("YouTube account connection is not enabled yet.");
    }
    throw new Error(
      "Could not connect this YouTube account. Please choose another account or try again.",
    );
  }
  window.location.assign(result.data.url);
}
