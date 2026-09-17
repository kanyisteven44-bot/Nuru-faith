import { createFileRoute } from "@tanstack/react-router";

const API = "https://www.googleapis.com/youtube/v3";
const PAGE_SIZE = 50;
const MAX_PAGES = 40;
const DETAIL_CONCURRENCY = 16;

const HANDLES = [
  "life.church",
  "youversion",
  "TheBibleRecap",
  "SpokenGospel",
  "TheChosenSeries",
  "desiringGod",
  "TheGospelCoalition",
  "gotquestions",
  "TransformationChurch",
  "iamMikeTodd",
  "PassionCityChurch",
  "passionmusic",
  "GatewayWorship",
  "upperroom",
  "housefires",
  "JesusCulture",
  "PhilWickham",
  "BrandonLakeOfficial",
  "cecewinans",
  "christomlin",
  "KariJobe",
  "laurendaiglemusic",
  "forKINGANDCOUNTRY",
  "Lecrae",
  "KirkFranklin",
  "DonMoenTV",
  "Sinach",
  "NathanielBasseyMain",
  "DunsinOyekan",
  "MosesBliss",
  "AdaEhi",
  "FrankEdwards",
  "TimGodfreyWorld",
  "CityAlight",
  "shaneandshane",
  "SovereignGraceMusic",
  "WorshipTogether",
  "JoyceMeyerMinistries",
  "JoelOsteen",
  "JosephPrince",
  "SaddlebackChurch",
  "TBN",
] as const;

const EXISTING_IDS = new Set([
  "UCVfwlh9XpX2Y_tQfjeln9QA",
  "UCIQqvZbHSwX0yKNVK1MyYjQ",
  "UCSYGkbzVd5-EzAMEpf3EaGg",
  "UC4q12NoPNySbVqwpw4iO5Vg",
  "UCsOoQeBWPnfWBYAwmO795zg",
  "UCSf-NCzjwcnXErUBW_qeFvA",
  "UCbertc-gMbkkHuSmg0qwnxw",
  "UCp7yiXtvaB3UmVMDEelFgWA",
  "UCXttfHaCtBRik2vCKmz2D8w",
  "UCE8tXEgcltIcPvjFBWS5UXQ",
  "UCp0dT8yDEAVe2LVjP9QFwjw",
  "UCn9mRGNo0CYj7nE6MepnWOQ",
  "UCw5d9msTsAVx7DIk6vaFrfQ",
]);

function seconds(iso?: string) {
  if (!iso) return null;
  const m = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return null;
  return Number(m[1] ?? 0) * 86400 + Number(m[2] ?? 0) * 3600 + Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0);
}

async function resolveHandle(key: string, handle: string) {
  const url = new URL(`${API}/channels`);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("forHandle", handle);
  url.searchParams.set("key", key);
  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) return null;
  const body = (await response.json()) as { items?: Array<{ id?: string; snippet?: { title?: string } }> };
  const item = body.items?.[0];
  return item?.id ? { id: item.id, name: item.snippet?.title ?? handle, handle } : null;
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
    if (!response.ok) break;
    const body = (await response.json()) as { nextPageToken?: string; items?: Array<{ contentDetails?: { videoId?: string } }> };
    for (const item of body.items ?? []) if (item.contentDetails?.videoId) ids.push(item.contentDetails.videoId);
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
    const results = await Promise.all(window.map(async (batch) => {
      const url = new URL(`${API}/videos`);
      url.searchParams.set("part", "contentDetails,status");
      url.searchParams.set("id", batch.join(","));
      url.searchParams.set("key", key);
      const response = await fetch(url.toString(), { cache: "no-store" });
      if (!response.ok) return 0;
      const body = (await response.json()) as { items?: Array<{ contentDetails?: { duration?: string }; status?: { embeddable?: boolean; privacyStatus?: string } }> };
      return (body.items ?? []).filter((item) => {
        const d = seconds(item.contentDetails?.duration);
        return item.status?.embeddable === true && item.status?.privacyStatus === "public" && d != null && d > 0 && d <= 180;
      }).length;
    }));
    playable += results.reduce((a, b) => a + b, 0);
  }
  return playable;
}

export const Route = createFileRoute("/qa-reels-extra-4f7b")({
  server: { handlers: { GET: async () => {
    if (process.env["VERCEL_ENV"] === "production") return new Response("Not found", { status: 404 });
    const key = process.env["YOUTUBE_API_KEY"];
    if (!key) return Response.json({ error: "not-configured" }, { status: 503 });
    const started = Date.now();
    const resolved = (await Promise.all(HANDLES.map((handle) => resolveHandle(key, handle))))
      .filter((item): item is NonNullable<typeof item> => !!item)
      .filter((item) => !EXISTING_IDS.has(item.id));
    const unique = [...new Map(resolved.map((item) => [item.id, item])).values()];
    const rows = await Promise.all(unique.map(async (channel) => {
      const crawled = await crawlChannel(key, channel.id);
      const playable = await playableCount(key, crawled.ids);
      return { ...channel, raw: crawled.ids.length, pages: crawled.pages, playable };
    }));
    rows.sort((a, b) => b.playable - a.playable);
    return Response.json({ requestedHandles: HANDLES.length, resolvedUnique: unique.length, raw: rows.reduce((s, r) => s + r.raw, 0), playableShorts: rows.reduce((s, r) => s + r.playable, 0), elapsedMs: Date.now() - started, channels: rows });
  } } },
});
