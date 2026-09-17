import { createFileRoute } from "@tanstack/react-router";

const API = "https://www.googleapis.com/youtube/v3";
const PAGE_SIZE = 50;
const MAX_PAGES = 40;
const DETAIL_CONCURRENCY = 16;

const CHANNELS = [
  ["UCVfwlh9XpX2Y_tQfjeln9QA", "BibleProject"],
  ["UCIQqvZbHSwX0yKNVK1MyYjQ", "Elevation Church"],
  ["UCSYGkbzVd5-EzAMEpf3EaGg", "Hillsong Church"],
  ["UC4q12NoPNySbVqwpw4iO5Vg", "Hillsong Worship"],
  ["UCsOoQeBWPnfWBYAwmO795zg", "Hillsong UNITED"],
  ["UCSf-NCzjwcnXErUBW_qeFvA", "Elevation Worship"],
  ["UCbertc-gMbkkHuSmg0qwnxw", "Bethel Music"],
  ["UCp7yiXtvaB3UmVMDEelFgWA", "WorshipU by Bethel Music"],
  ["UCXttfHaCtBRik2vCKmz2D8w", "Maverick City Music"],
  ["UCE8tXEgcltIcPvjFBWS5UXQ", "Joyous Celebration"],
  ["UCp0dT8yDEAVe2LVjP9QFwjw", "Spirit Of Praise"],
  ["UCn9mRGNo0CYj7nE6MepnWOQ", "Mercy Masika"],
  ["UCw5d9msTsAVx7DIk6vaFrfQ", "Kambua"],
] as const;

function seconds(iso?: string) {
  if (!iso) return null;
  const m = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return null;
  return Number(m[1] ?? 0) * 86400 + Number(m[2] ?? 0) * 3600 + Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0);
}

async function crawlChannel(key: string, channelId: string) {
  const playlistId = `UU${channelId.slice(2)}`;
  const ids: string[] = [];
  let token: string | undefined;
  let pages = 0;

  while (pages < MAX_PAGES) {
    const url = new URL(`${API}/playlistItems`);
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", String(PAGE_SIZE));
    url.searchParams.set("key", key);
    if (token) url.searchParams.set("pageToken", token);
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) throw new Error(`playlist ${channelId} ${response.status}`);
    const body = (await response.json()) as {
      nextPageToken?: string;
      items?: Array<{ contentDetails?: { videoId?: string } }>;
    };
    for (const item of body.items ?? []) {
      if (item.contentDetails?.videoId) ids.push(item.contentDetails.videoId);
    }
    pages += 1;
    if (!body.nextPageToken) break;
    token = body.nextPageToken;
  }
  return { ids, pages };
}

async function playableCount(key: string, ids: string[]) {
  let playable = 0;
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += 50) batches.push(ids.slice(i, i + 50));

  for (let start = 0; start < batches.length; start += DETAIL_CONCURRENCY) {
    const window = batches.slice(start, start + DETAIL_CONCURRENCY);
    const results = await Promise.all(
      window.map(async (batch) => {
        const url = new URL(`${API}/videos`);
        url.searchParams.set("part", "contentDetails,status");
        url.searchParams.set("id", batch.join(","));
        url.searchParams.set("key", key);
        const response = await fetch(url.toString(), { cache: "no-store" });
        if (!response.ok) throw new Error(`videos ${response.status}`);
        const body = (await response.json()) as {
          items?: Array<{
            contentDetails?: { duration?: string };
            status?: { embeddable?: boolean; privacyStatus?: string };
          }>;
        };
        return (body.items ?? []).filter((item) => {
          const duration = seconds(item.contentDetails?.duration);
          return item.status?.embeddable === true && item.status?.privacyStatus === "public" && duration != null && duration > 0 && duration <= 180;
        }).length;
      }),
    );
    playable += results.reduce((a, b) => a + b, 0);
  }
  return playable;
}

export const Route = createFileRoute("/qa-reels-catalog-4f7a")({
  server: {
    handlers: {
      GET: async () => {
        if (process.env["VERCEL_ENV"] === "production") return new Response("Not found", { status: 404 });
        const key = process.env["YOUTUBE_API_KEY"];
        if (!key) return Response.json({ error: "not-configured" }, { status: 503 });
        const started = Date.now();
        try {
          const crawled = await Promise.all(
            CHANNELS.map(async ([id, name]) => ({ id, name, ...(await crawlChannel(key, id)) })),
          );
          const unique = new Map<string, string>();
          for (const channel of crawled) for (const id of channel.ids) unique.set(id, channel.id);

          const perChannel = [] as Array<{ id: string; name: string; raw: number; pages: number; playable: number }>;
          for (const channel of crawled) {
            perChannel.push({
              id: channel.id,
              name: channel.name,
              raw: channel.ids.length,
              pages: channel.pages,
              playable: await playableCount(key, channel.ids),
            });
          }
          const totalPlayable = perChannel.reduce((sum, channel) => sum + channel.playable, 0);
          return Response.json({
            trustedChannels: CHANNELS.length,
            rawUnique: unique.size,
            playableShorts: totalPlayable,
            targetMet: totalPlayable >= 10_000,
            elapsedMs: Date.now() - started,
            perChannel,
          });
        } catch (error) {
          return Response.json({ error: error instanceof Error ? error.message : "unknown", elapsedMs: Date.now() - started }, { status: 500 });
        }
      },
    },
  },
});
