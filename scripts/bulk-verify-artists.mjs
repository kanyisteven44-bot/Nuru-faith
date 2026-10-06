import { mkdir, writeFile } from "node:fs/promises";

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  throw new Error("YOUTUBE_API_KEY is required for the artist verification build.");
}

const TARGET_NEW = Number(process.env.NURU_ARTIST_TARGET_NEW ?? 2000);
const QUOTA_BUDGET = Number(process.env.NURU_YOUTUBE_QUOTA_BUDGET ?? 9400);
const TODAY = new Date().toISOString().slice(0, 10);
let quotaSpent = 0;
let queriesRun = 0;
let rawChannels = 0;
let prefiltered = 0;
let playlistChecks = 0;
const failures = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function yt(path, params, cost = 1) {
  if (quotaSpent + cost > QUOTA_BUDGET) {
    const err = new Error("quota budget reached");
    err.code = "LOCAL_QUOTA_BUDGET";
    throw err;
  }
  quotaSpent += cost;
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  url.search = new URLSearchParams({ ...params, key: API_KEY }).toString();
  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (response.ok) return response.json();
    if (response.status === 429 || response.status >= 500) {
      await sleep(500 * 2 ** attempt);
      continue;
    }
    const body = await response.text().catch(() => "");
    const err = new Error(`YouTube ${path} returned ${response.status}: ${body.slice(0, 240)}`);
    err.status = response.status;
    throw err;
  }
  const body = await response.text().catch(() => "");
  throw new Error(`YouTube ${path} failed after retries: ${body.slice(0, 240)}`);
}

async function existingApprovedIds() {
  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return new Set();
  const url = new URL("/rest/v1/approved_youtube_channels", base);
  url.search = new URLSearchParams({
    select: "channel_id",
    limit: "5000",
  }).toString();
  try {
    const response = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return new Set();
    const rows = await response.json();
    return new Set(rows.map((row) => row.channel_id).filter(Boolean));
  } catch {
    return new Set();
  }
}

const FAITH_WORDS = [
  "gospel","worship","praise","christian","jesus","christ","hymn","hymns",
  "worshipper","worshiper","minstrel","injili","sifa","ibada","bwana","mungu","yesu",
  "ngai","nyasaye","mwathani","asis","enkai","akuj","murungu",
  "évangile","evangile","chrétien","chretien","louange","adoration","jésus","jesus",
  "louvor","adoração","adoracao","cristão","cristao",
  "alabanza","adoración","adoracion","cristiano","jesús",
  "lobpreis","anbetung","christlich",
  "papuri","pagsamba","kristiyano"
];

const MUSIC_WORDS = [
  "music","musician","singer","artist","songwriter","recording artist",
  "worship leader","worship artist","gospel artist","band","choir","chorale",
  "vocalist","minstrel","songs","song","music ministry","music minister",
  "musique","chanteur","chanteuse","artiste","música","musica","cantor","cantora",
  "cantante","musik"
];

const BLOCK_WORDS = [
  "dj ","dj-","mixtape","nonstop mix","mix vol","karaoke","lyrics channel",
  "news","politics","movie","film","trailer","comedy","radio station","television network",
  "record label","records official","distribution","music distributor"
];

const SPOKEN_TITLE = /\b(sermon|preaching|preacher|sunday service|church service|bible study|teaching|message|podcast|interview|testimony|conference|revival service|prayer meeting|morning devotion|evening devotion|livestream|live stream)\b/i;

function norm(value) {
  return String(value ?? "").toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu, "");
}
function hasAny(text, words) {
  const n = norm(text);
  return words.some((w) => n.includes(norm(w)));
}
function faithSignal(channel) {
  const text = [
    channel.snippet?.title,
    channel.snippet?.description,
    channel.brandingSettings?.channel?.keywords,
  ].filter(Boolean).join(" ");
  if (hasAny(text, BLOCK_WORDS)) return false;
  return hasAny(text, FAITH_WORDS);
}
function musicSignal(channel) {
  const text = [
    channel.snippet?.title,
    channel.snippet?.description,
    channel.brandingSettings?.channel?.keywords,
  ].filter(Boolean).join(" ");
  const topicMusic = (channel.topicDetails?.topicCategories ?? []).some((v) =>
    /wikipedia\.org\/wiki\/Music/i.test(v),
  );
  return topicMusic || hasAny(text, MUSIC_WORDS);
}
function orgOnly(channel) {
  const title = norm(channel.snippet?.title);
  const desc = norm(channel.snippet?.description);
  const org = /\b(church|cathedral|parish|diocese|chapel|mosque|news|tv|television|radio|network)\b/.test(title);
  if (!org) return false;
  return !hasAny(`${title} ${desc}`, ["music","choir","worship","singer","artist","band","songs"]);
}
function plausibleUpload(title) {
  if (!title || SPOKEN_TITLE.test(title)) return false;
  return !/\b(shorts compilation|reaction|behind the scenes|announcement|trailer)\b/i.test(title);
}

const eastPriority = [
  ["Kenya gospel worship artists","KE","en",["en","sw"]],
  ["nyimbo za injili Kenya","KE","sw",["sw"]],
  ["Kikuyu gospel music artists","KE","en",["ki"]],
  ["Kalenjin gospel music artists","KE","en",["kln"]],
  ["Luo gospel music artists Kenya","KE","en",["luo"]],
  ["Kamba gospel music artists","KE","en",["kam"]],
  ["Luhya gospel music artists","KE","en",["luy"]],
  ["Kisii gospel music artists","KE","en",["guz"]],
  ["Maasai gospel worship artists","KE","en",["mas"]],
  ["Turkana gospel worship music","KE","en",["tuv"]],
  ["Uganda gospel worship artists","UG","en",["en"]],
  ["Tanzania gospel music artists","TZ","sw",["sw"]],
  ["Rwanda gospel worship artists","RW","en",["en","fr"]],
  ["Burundi gospel worship artists","BI","fr",["fr"]],
  ["Ethiopia gospel worship singers","ET","en",["en"]],
  ["South Sudan gospel worship artists","SS","en",["en"]],
];

const africa = [
  ["Nigeria","NG","en"],["Ghana","GH","en"],["South Africa","ZA","en"],
  ["Zambia","ZM","en"],["Zimbabwe","ZW","en"],["Malawi","MW","en"],
  ["Botswana","BW","en"],["Namibia","NA","en"],["Lesotho","LS","en"],
  ["Eswatini","SZ","en"],["Sierra Leone","SL","en"],["Liberia","LR","en"],
  ["Gambia","GM","en"],["Cameroon","CM","fr"],["DR Congo","CD","fr"],
  ["Congo","CG","fr"],["Côte d'Ivoire","CI","fr"],["Senegal","SN","fr"],
  ["Benin","BJ","fr"],["Togo","TG","fr"],["Burkina Faso","BF","fr"],
  ["Mali","ML","fr"],["Guinea","GN","fr"],["Gabon","GA","fr"],
  ["Central African Republic","CF","fr"],["Madagascar","MG","fr"],
  ["Mauritius","MU","en"],["Mozambique","MZ","pt"],["Angola","AO","pt"],
  ["Cabo Verde","CV","pt"],["Seychelles","SC","en"],
];

const world = [
  ["United States","US","en"],["United Kingdom","GB","en"],["Canada","CA","en"],
  ["Australia","AU","en"],["New Zealand","NZ","en"],["Brazil","BR","pt"],
  ["Mexico","MX","es"],["Colombia","CO","es"],["Argentina","AR","es"],
  ["Chile","CL","es"],["Peru","PE","es"],["Philippines","PH","en"],
  ["India","IN","en"],["Singapore","SG","en"],["Malaysia","MY","en"],
  ["Germany","DE","de"],["France","FR","fr"],["Netherlands","NL","en"],
  ["Sweden","SE","en"],["Norway","NO","en"],["Finland","FI","en"],
  ["Poland","PL","en"],["Romania","RO","en"],["Ukraine","UA","en"],
  ["South Korea","KR","en"],["Japan","JP","en"],
];

function countryQuery(name, lang) {
  if (lang === "fr") return `${name} musique gospel louange artistes`;
  if (lang === "pt") return `${name} música gospel louvor artistas`;
  if (lang === "es") return `${name} música cristiana adoración artistas`;
  if (lang === "de") return `${name} christliche worship gospel musik`;
  return `${name} gospel worship music artists`;
}

const interleaved = [];
const maxLen = Math.max(africa.length, world.length);
for (let i = 0; i < maxLen; i++) {
  if (africa[i]) {
    const [name, region, lang] = africa[i];
    interleaved.push([countryQuery(name, lang), region, lang, [lang]]);
  }
  if (world[i]) {
    const [name, region, lang] = world[i];
    interleaved.push([countryQuery(name, lang), region, lang, [lang]]);
  }
}
const specs = [...eastPriority, ...interleaved].map(([query, region, lang, languages]) => ({
  query, region, lang, languages,
}));

const existing = await existingApprovedIds();
const seen = new Set(existing);
const verified = [];
let stoppedReason = null;

async function searchSpec(spec) {
  const search = await yt("search", {
    part: "snippet",
    q: spec.query,
    type: "channel",
    maxResults: "50",
    safeSearch: "strict",
    order: "relevance",
    regionCode: spec.region,
    relevanceLanguage: spec.lang,
  }, 100);
  queriesRun += 1;
  const ids = [...new Set((search.items ?? [])
    .map((item) => item.snippet?.channelId ?? item.id?.channelId)
    .filter(Boolean))]
    .filter((id) => !seen.has(id));
  rawChannels += ids.length;
  if (!ids.length) return [];
  const details = await yt("channels", {
    part: "snippet,statistics,contentDetails,topicDetails,brandingSettings",
    id: ids.join(","),
    maxResults: "50",
  }, 1);
  return (details.items ?? []).filter((channel) => {
    const videos = Number(channel.statistics?.videoCount ?? 0);
    if (videos < 3) return false;
    if (!channel.contentDetails?.relatedPlaylists?.uploads) return false;
    if (!faithSignal(channel) || !musicSignal(channel) || orgOnly(channel)) return false;
    return true;
  });
}

async function verifyChannel(channel, spec) {
  const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return null;
  playlistChecks += 1;
  const page = await yt("playlistItems", {
    part: "snippet,contentDetails",
    playlistId: uploads,
    maxResults: "10",
  }, 1);
  const plausible = (page.items ?? [])
    .map((item) => item.snippet?.title ?? "")
    .filter(plausibleUpload);
  if (plausible.length < 3) return null;
  const sn = channel.snippet ?? {};
  return {
    name: sn.title?.trim() || channel.id,
    youtube_channel_id: channel.id,
    country: sn.country ?? null,
    description: (sn.description ?? "").slice(0, 700) || null,
    avatar_url:
      sn.thumbnails?.high?.url ??
      sn.thumbnails?.medium?.url ??
      sn.thumbnails?.default?.url ??
      null,
    language_codes: spec.languages?.length ? spec.languages : ["und"],
    discovered_by: spec.query,
    sample_titles: plausible.slice(0, 3),
    verified_at: TODAY,
    verification_basis:
      "YouTube channel metadata self-identifies as Christian/gospel/worship music and at least three recent uploads are plausible music rather than spoken programming.",
  };
}

outer:
for (const spec of specs) {
  if (verified.length >= TARGET_NEW) {
    stoppedReason = "target reached";
    break;
  }
  if (quotaSpent >= QUOTA_BUDGET - 120) {
    stoppedReason = "local quota budget reached";
    break;
  }
  let channels;
  try {
    channels = await searchSpec(spec);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    failures.push({ query: spec.query, error: msg });
    if (/quota|403|LOCAL_QUOTA_BUDGET/i.test(msg)) {
      stoppedReason = msg;
      break;
    }
    continue;
  }
  prefiltered += channels.length;

  for (let i = 0; i < channels.length; i += 8) {
    const chunk = channels.slice(i, i + 8);
    let results;
    try {
      results = await Promise.all(
        chunk.map(async (channel) => {
          if (seen.has(channel.id)) return null;
          const row = await verifyChannel(channel, spec);
          return row ? { channel, row } : null;
        }),
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      failures.push({ query: spec.query, error: msg });
      if (/quota|403|LOCAL_QUOTA_BUDGET/i.test(msg)) {
        stoppedReason = msg;
        break outer;
      }
      continue;
    }
    for (const result of results) {
      if (!result) continue;
      if (seen.has(result.channel.id)) continue;
      seen.add(result.channel.id);
      verified.push(result.row);
      if (verified.length >= TARGET_NEW) {
        stoppedReason = "target reached";
        break outer;
      }
    }
  }
}

await mkdir("public", { recursive: true });
const payload = {
  generated_at: new Date().toISOString(),
  target_new: TARGET_NEW,
  existing_approved_channel_ids_seen: existing.size,
  verified_new: verified.length,
  estimated_total_after_insert: existing.size + verified.length,
  quota_budget: QUOTA_BUDGET,
  quota_spent_estimate: quotaSpent,
  queries_run: queriesRun,
  raw_unique_candidates: rawChannels,
  prefiltered_candidates: prefiltered,
  playlist_checks: playlistChecks,
  stopped_reason: stoppedReason ?? "query list exhausted",
  failures,
  artists: verified,
};
await writeFile("public/verified-artists.json", JSON.stringify(payload, null, 2) + "\n");
console.log(
  `Verified ${verified.length} new artist/channel sources; existing public approved channels ${existing.size}; ` +
  `quota≈${quotaSpent}; queries=${queriesRun}; stopped=${payload.stopped_reason}`,
);
