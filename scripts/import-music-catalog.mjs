/** Import metadata only. Playback remains in the official YouTube player. */
import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "node:fs/promises";
import { eligibleMusicVideo, isoSeconds, MUSIC_SOURCE_NAMES } from "../src/lib/musicImport.ts";

const key = process.env.YOUTUBE_API_KEY;
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key || !url || !secret) {
  console.error(
    "Required server environment: YOUTUBE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Never place these keys in VITE_ variables.",
  );
  process.exit(1);
}
const target = Number(process.env.NURU_MUSIC_TARGET ?? 10000);
if (!Number.isSafeInteger(target) || target < 1) throw new Error("Invalid target");
const db = createClient(url, secret, { auth: { persistSession: false } });
const statePath = process.env.NURU_IMPORT_STATE ?? ".media-import-state.json";
let state;
try {
  state = JSON.parse(await readFile(statePath, "utf8"));
} catch {
  state = { channels: {} };
}
async function save() {
  await writeFile(statePath, JSON.stringify(state, null, 2));
}
async function yt(path, params) {
  const request = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  request.search = new URLSearchParams({ ...params, key }).toString();
  const response = await fetch(request, { signal: AbortSignal.timeout(20000) });
  if (!response.ok)
    throw new Error(
      `YouTube ${path} returned ${response.status}; progress is saved. Check key, API enablement and quota.`,
    );
  return response.json();
}
async function count() {
  const { count, error } = await db
    .from("media_items")
    .select("id", { count: "exact", head: true })
    .eq("source", "youtube")
    .eq("media_type", "music")
    .eq("is_approved", true);
  if (error) throw error;
  return count ?? 0;
}
const { data: sources, error } = await db
  .from("media_sources")
  .select("id,name,youtube_channel_id")
  .eq("is_approved", true)
  .eq("source_type", "youtube");
if (error) throw error;
// Explicit musical sources. Never classify every sermon/channel upload as a song.
const names = new Set(MUSIC_SOURCE_NAMES);
let total = await count();
try {
  for (const source of (sources ?? []).filter((s) => names.has(s.name) && s.youtube_channel_id)) {
    if (total >= target) break;
    const channelId = source.youtube_channel_id;
    if (state.channels[channelId]?.done) continue;
    const channel = await yt("channels", { part: "contentDetails", id: channelId });
    const playlistId = channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!playlistId) {
      console.warn(`No uploads playlist: ${source.name}`);
      continue;
    }
    let token = state.channels[channelId]?.token;
    do {
      const page = await yt("playlistItems", {
        part: "contentDetails",
        playlistId,
        maxResults: "50",
        ...(token ? { pageToken: token } : {}),
      });
      const ids = page.items.map((i) => i.contentDetails?.videoId).filter(Boolean);
      const videos = ids.length
        ? await yt("videos", { part: "snippet,status,contentDetails", id: ids.join(",") })
        : { items: [] };
      const rows = videos.items
        .filter((v) => eligibleMusicVideo(v, channelId))
        .map((v) => ({
          source: "youtube",
          external_id: v.id,
          source_id: source.id,
          title: v.snippet.title,
          creator_name: v.snippet.channelTitle,
          youtube_channel_id: channelId,
          media_type: "music",
          category: "worship",
          thumbnail_url:
            v.snippet.thumbnails?.high?.url ?? v.snippet.thumbnails?.medium?.url ?? null,
          duration_seconds: isoSeconds(v.contentDetails.duration),
          published_at: v.snippet.publishedAt,
          is_approved: true,
          can_download: false,
        }));
      if (rows.length) {
        // Keep existing editorial decisions and saves; uniqueness prevents repeated imports.
        const { error } = await db
          .from("media_items")
          .upsert(rows, { onConflict: "source,external_id", ignoreDuplicates: true });
        if (error) throw error;
      }
      token = page.nextPageToken;
      state.channels[channelId] = { token: token ?? null, done: !token };
      await save();
      total = await count();
      console.log(`${source.name}: ${total.toLocaleString()} distinct published songs`);
    } while (token && total < target);
  }
  console.log(`Catalogue: ${total.toLocaleString()} / ${target.toLocaleString()} songs.`);
  if (total < target) {
    console.error(
      "Approved music sources exhausted before the target. Add reviewed official music sources; do not duplicate entries.",
    );
    process.exitCode = 2;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Import failed");
  process.exitCode = 1;
}
