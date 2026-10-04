/**
 * Resolve candidate artist names into reviewed media_sources rows.
 *
 * Reads content/music-source-candidates.json, and for each name that is not
 * already reviewed:
 *   1. searches YouTube for the channel,
 *   2. refuses anything that is not a confident, unambiguous name match,
 *   3. confirms the channel actually publishes eligible music (same rules the
 *      catalogue importer uses), and
 *   4. records the channel id, avatar and a real sample video as proof.
 *
 * Confirmed artists are merged into content/media-source-review.json.
 * Anything that does not resolve is written to the unresolved report for a
 * person to check — it is never guessed at, because a wrong channel id makes
 * the importer serve the wrong channel's uploads as worship music.
 *
 * This only writes the review file. Seeding the database stays a separate,
 * deliberate step (supabase/seeds/multilingual_sources.sql).
 *
 *   YOUTUBE_API_KEY=... node scripts/resolve-music-sources.mjs
 *
 * Env:
 *   YOUTUBE_API_KEY   required, server-only. Never a VITE_ variable.
 *   NURU_DRY_RUN=1    resolve and report, write nothing.
 *   NURU_MAX_LOOKUPS  stop after N searched candidates (quota guard).
 */
import { readFile, writeFile } from "node:fs/promises";
import {
  isKnownChannel,
  partitionAgainstExisting,
  pickBestChannel,
  qualifiesAsMusicSource,
  toReviewedSource,
} from "../src/lib/musicSourceResolver.ts";
import { eligibleMusicVideo } from "../src/lib/musicImport.ts";

const key = process.env.YOUTUBE_API_KEY;
if (!key) {
  console.error(
    "Required: YOUTUBE_API_KEY (server-only; never a VITE_ variable).\n" +
      "Create one at https://console.cloud.google.com/apis/credentials with the\n" +
      "YouTube Data API v3 enabled, then re-run.",
  );
  process.exit(1);
}

const DRY_RUN = !!process.env.NURU_DRY_RUN;
const MAX_LOOKUPS = Number(process.env.NURU_MAX_LOOKUPS ?? 500);
const CANDIDATES = "content/music-source-candidates.json";
const REVIEWED = "content/media-source-review.json";
const UNRESOLVED = "content/music-source-unresolved.json";

/** Each search costs 100 quota units of a default 10,000/day, so ~95 names. */
let quotaSpent = 0;

async function yt(path, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  url.search = new URLSearchParams({ ...params, key }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `YouTube ${path} returned ${response.status}. ` +
        `Spent about ${quotaSpent} quota units this run. ${body.slice(0, 200)}`,
    );
  }
  return response.json();
}

/** Channels matching a name, as ChannelSummary objects. */
async function searchChannels(name) {
  quotaSpent += 100;
  const found = await yt("search", {
    part: "snippet",
    q: name,
    type: "channel",
    maxResults: "5",
    regionCode: "KE",
    relevanceLanguage: "sw",
  });
  const ids = (found.items ?? [])
    .map((i) => i.snippet?.channelId ?? i.id?.channelId)
    .filter(Boolean);
  if (!ids.length) return [];

  quotaSpent += 1;
  const detail = await yt("channels", {
    part: "snippet,statistics",
    id: ids.join(","),
  });
  return (detail.items ?? []).map((c) => ({
    channelId: c.id,
    title: c.snippet?.title ?? "",
    description: c.snippet?.description ?? "",
    avatarUrl: c.snippet?.thumbnails?.high?.url ?? c.snippet?.thumbnails?.default?.url ?? null,
    customUrl: c.snippet?.customUrl ?? null,
    subscriberCount: Number(c.statistics?.subscriberCount ?? 0),
    videoCount: Number(c.statistics?.videoCount ?? 0),
  }));
}

/**
 * Eligible music videos from a channel's uploads, using the same rules the
 * catalogue importer applies, so a channel can never qualify here and then
 * yield nothing on import.
 */
async function sampleMusic(channelId) {
  quotaSpent += 1;
  const channel = await yt("channels", { part: "contentDetails", id: channelId });
  const uploads = channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return [];

  quotaSpent += 1;
  const page = await yt("playlistItems", {
    part: "contentDetails",
    playlistId: uploads,
    maxResults: "25",
  });
  const ids = (page.items ?? []).map((i) => i.contentDetails?.videoId).filter(Boolean);
  if (!ids.length) return [];

  quotaSpent += 1;
  const videos = await yt("videos", {
    part: "snippet,status,contentDetails",
    id: ids.join(","),
  });
  return (videos.items ?? [])
    .filter((v) => eligibleMusicVideo(v, channelId))
    .map((v) => ({ id: v.id, title: v.snippet.title }));
}

const file = JSON.parse(await readFile(CANDIDATES, "utf8"));
const reviewed = JSON.parse(await readFile(REVIEWED, "utf8"));
const today = new Date().toISOString().slice(0, 10);

// Drop in-file duplicates before anything costs quota.
const seen = new Set();
const candidates = file.candidates.filter((c) => {
  const key = `${c.name.toLowerCase()}|${c.languages.join(",")}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

const { fresh, alreadyKnown } = partitionAgainstExisting(candidates, reviewed);
console.log(
  `${candidates.length} candidates: ${alreadyKnown.length} already reviewed, ${fresh.length} to resolve.`,
);
if (DRY_RUN) console.log("NURU_DRY_RUN set — nothing will be written.\n");

const added = [];
const unresolved = [];
let looked = 0;

for (const candidate of fresh) {
  if (looked >= MAX_LOOKUPS) {
    unresolved.push({ ...candidate, reason: "lookup budget reached" });
    continue;
  }
  looked += 1;
  try {
    const channels = await searchChannels(candidate.handle ?? candidate.name);
    const pick = pickBestChannel(candidate.name, channels);
    if (!pick.ok) {
      unresolved.push({ ...candidate, reason: pick.reason, best: pick.best ?? null });
      console.log(`  skip   ${candidate.name.padEnd(28)} ${pick.reason}`);
      continue;
    }
    if (isKnownChannel(pick.channel.channelId, reviewed)) {
      console.log(`  known  ${candidate.name.padEnd(28)} already reviewed under another name`);
      continue;
    }

    const songs = await sampleMusic(pick.channel.channelId);
    if (!qualifiesAsMusicSource(songs.length)) {
      const reason = `only ${songs.length} eligible music uploads`;
      unresolved.push({ ...candidate, reason, channelId: pick.channel.channelId });
      console.log(`  skip   ${candidate.name.padEnd(28)} ${reason}`);
      continue;
    }

    const row = toReviewedSource({
      channel: pick.channel,
      languages: candidate.languages,
      sample: songs[0],
      verifiedAt: today,
    });
    added.push(row);
    reviewed.push(row);
    console.log(
      `  ADD    ${row.name.padEnd(28)} ${candidate.languages.join(",").padEnd(8)} ` +
        `${songs.length}+ songs  ${row.youtube_channel_id}`,
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : "lookup failed";
    unresolved.push({ ...candidate, reason });
    console.error(`  ERROR  ${candidate.name}: ${reason}`);
    if (/quota|403/i.test(reason)) {
      console.error("Stopping: quota or access problem. Progress so far is still written.");
      break;
    }
  }
}

if (!DRY_RUN) {
  reviewed.sort((a, b) => a.name.localeCompare(b.name));
  await writeFile(REVIEWED, `${JSON.stringify(reviewed, null, 2)}\n`);
  await writeFile(UNRESOLVED, `${JSON.stringify({ generated_at: today, unresolved }, null, 2)}\n`);
}

console.log(
  `\n${added.length} added, ${unresolved.length} unresolved, ` +
    `${reviewed.length} reviewed artists in total. About ${quotaSpent} quota units spent.`,
);
if (unresolved.length && !DRY_RUN) {
  console.log(`Unresolved names written to ${UNRESOLVED} for manual review.`);
}
console.log(
  "Next: regenerate supabase/seeds/multilingual_sources.sql from the review file, " +
    "then run the catalogue import to pull songs.",
);
