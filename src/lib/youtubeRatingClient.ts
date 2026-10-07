export class YouTubeConnectionRequired extends Error {}
export async function youtubeRatingRequest(
  videoId: string,
  token: string | null | undefined,
  rating?: "like" | "none",
  transport: typeof fetch = fetch,
) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Error("This video is unavailable.");
  if (!token) throw new YouTubeConnectionRequired("Connect YouTube to like videos.");
  const path =
    rating === undefined
      ? `videos/getRating?id=${videoId}`
      : `videos/rate?id=${videoId}&rating=${rating}`;
  const res = await transport(`https://www.googleapis.com/youtube/v3/${path}`, {
    method: rating === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(12000),
  });
  if (res.status === 401) throw new YouTubeConnectionRequired("Reconnect YouTube to continue.");
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (
      body?.error?.errors?.some((e: { reason: string }) =>
        ["insufficientPermissions", "youtubeSignupRequired"].includes(e.reason),
      )
    )
      throw new YouTubeConnectionRequired("Connect your YouTube account to continue.");
    throw new Error("YouTube could not update this like. Please try again.");
  }
  if (rating !== undefined) return rating;
  const body = await res.json();
  return body.items?.[0]?.rating as "like" | "dislike" | "none" | undefined;
}
