import { z } from "zod";
import { eligiblePodcastVideo, eligibleReviewedMusicUpload, isoSeconds } from "./musicImport.ts";

const thumb = z.object({ url: z.string() });
const videoSchema = z.object({
  id: z.string(),
  snippet: z.object({
    title: z.string(),
    channelId: z.string(),
    channelTitle: z.string(),
    categoryId: z.string().optional(),
    publishedAt: z.string(),
    defaultAudioLanguage: z.string().optional(),
    thumbnails: z.object({ high: thumb.optional(), medium: thumb.optional() }),
  }),
  status: z.object({
    embeddable: z.boolean(),
    privacyStatus: z.string(),
    uploadStatus: z.string(),
  }),
  contentDetails: z.object({
    duration: z.string(),
    regionRestriction: z
      .object({ blocked: z.array(z.string()).optional(), allowed: z.array(z.string()).optional() })
      .optional(),
  }),
});
export type ImportStats = {
  fetched: number;
  parsed: number;
  eligible: number;
  inserted: number;
  skippedExisting: number;
  rejected: number;
};
export type CatalogSource = {
  id: string;
  name: string;
  channelId: string;
  languages: string[];
  pageToken: string | null;
  playlistId: string | null;
};
export type ImportedMediaRow = {
  source: string;
  external_id: string;
  source_id: string;
  title: string;
  creator_name: string;
  youtube_channel_id: string;
  media_type: "music" | "podcast";
  category: string;
  language_code: string;
  thumbnail_url: string | null;
  duration_seconds: number;
  published_at: string;
  is_approved: boolean;
  can_download: boolean;
};
export type YouTubeCall = (path: string, params: Record<string, string>) => Promise<unknown>;

/** A page is checkpointed by the caller only after the idempotent insert succeeds. */
export async function processCatalogPage(input: {
  kind: "music" | "podcast";
  source: CatalogSource;
  call: YouTubeCall;
  existingIds: (ids: string[]) => Promise<Set<string>>;
  insert: (rows: ImportedMediaRow[]) => Promise<number>;
}) {
  const { source, kind, call } = input;
  let playlistId = source.playlistId;
  if (!playlistId) {
    const channel = z
      .object({
        items: z
          .array(
            z.object({
              contentDetails: z.object({ relatedPlaylists: z.object({ uploads: z.string() }) }),
            }),
          )
          .default([]),
      })
      .parse(await call("channels", { part: "contentDetails", id: source.channelId }));
    playlistId = channel.items[0]?.contentDetails.relatedPlaylists.uploads ?? null;
    if (!playlistId)
      throw new Error(
        "YouTube did not return an uploads playlist. Progress was preserved; retry later.",
      );
  }
  const page = z
    .object({
      items: z.array(z.object({ contentDetails: z.object({ videoId: z.string() }) })).default([]),
      nextPageToken: z.string().optional(),
    })
    .parse(
      await call("playlistItems", {
        part: "contentDetails",
        playlistId,
        maxResults: "50",
        ...(source.pageToken ? { pageToken: source.pageToken } : {}),
      }),
    );
  if (page.nextPageToken && page.nextPageToken === source.pageToken)
    throw new Error("YouTube repeated a page token. Import paused without advancing.");
  const ids = [...new Set(page.items.map((item) => item.contentDetails.videoId))];
  const existing = ids.length ? await input.existingIds(ids) : new Set<string>();
  const unseen = ids.filter((id) => !existing.has(id));
  const details = unseen.length
    ? z
        .object({ items: z.array(z.unknown()).default([]) })
        .parse(
          await call("videos", { part: "snippet,status,contentDetails", id: unseen.join(",") }),
        )
    : { items: [] };
  const requested = new Set(unseen);
  const uniqueVideos = new Map<string, z.infer<typeof videoSchema>>();
  for (const item of details.items) {
    const parsed = videoSchema.safeParse(item);
    if (parsed.success && requested.has(parsed.data.id))
      uniqueVideos.set(parsed.data.id, parsed.data);
  }
  const videos = [...uniqueVideos.values()];
  const eligible = videos.filter((video) =>
    (kind === "music" ? eligibleReviewedMusicUpload : eligiblePodcastVideo)(
      video,
      source.channelId,
    ),
  );
  const rows: ImportedMediaRow[] = eligible.map((video) => ({
    source: "youtube",
    external_id: video.id,
    source_id: source.id,
    title: video.snippet.title,
    creator_name: video.snippet.channelTitle,
    youtube_channel_id: source.channelId,
    media_type: kind,
    category: kind === "music" ? "worship" : "faith",
    language_code:
      video.snippet.defaultAudioLanguage?.split("-")[0] ?? source.languages[0] ?? "und",
    thumbnail_url:
      video.snippet.thumbnails.high?.url ?? video.snippet.thumbnails.medium?.url ?? null,
    duration_seconds: isoSeconds(video.contentDetails.duration),
    published_at: video.snippet.publishedAt,
    is_approved: true,
    can_download: false,
  }));
  const inserted = rows.length ? await input.insert(rows) : 0;
  if (!Number.isInteger(inserted) || inserted < 0 || inserted > rows.length)
    throw new Error("Database returned an invalid import count");
  const skippedExisting = ids.length - unseen.length + rows.length - inserted;
  const stats: ImportStats = {
    fetched: ids.length,
    parsed: videos.length,
    eligible: eligible.length,
    inserted,
    skippedExisting,
    rejected: ids.length - inserted - skippedExisting,
  };
  return { playlistId, nextPageToken: page.nextPageToken ?? null, stats };
}
