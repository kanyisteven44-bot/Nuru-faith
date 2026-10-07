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

/** Publish only after an explicit user submission; never retry a POST automatically. */
export async function youtubeCommentRequest(
  videoId: string,
  channelId: string,
  text: string,
  token: string | null | undefined,
  transport: typeof fetch = fetch,
) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId) || !/^UC[A-Za-z0-9_-]{22}$/.test(channelId))
    throw new Error("This video is unavailable.");
  const comment = text.trim();
  if (!comment || comment.length > 10000)
    throw new Error("Enter a comment of up to 10,000 characters.");
  if (!token) throw new YouTubeConnectionRequired("Connect YouTube to comment.");
  const res = await transport("https://www.googleapis.com/youtube/v3/commentThreads?part=snippet", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      snippet: { channelId, videoId, topLevelComment: { snippet: { textOriginal: comment } } },
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (res.status === 401) throw new YouTubeConnectionRequired("Reconnect YouTube to continue.");
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const reasons = body?.error?.errors?.map((e: { reason: string }) => e.reason) ?? [];
    if (
      reasons.some((r: string) =>
        ["insufficientPermissions", "youtubeSignupRequired", "ineligibleAccount"].includes(r),
      )
    )
      throw new YouTubeConnectionRequired("Connect your YouTube account to continue.");
    throw new Error(
      reasons.includes("commentsDisabled")
        ? "Comments are turned off for this video."
        : "YouTube could not confirm this comment. Check YouTube before trying again.",
    );
  }
  return res.json();
}
