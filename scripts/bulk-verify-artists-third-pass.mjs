import { mkdir, writeFile } from "node:fs/promises";

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) throw new Error("YOUTUBE_API_KEY is required.");

const TARGET_NEW = Number(process.env.NURU_ARTIST_TARGET_NEW ?? 2200);
const QUOTA_BUDGET = Number(process.env.NURU_YOUTUBE_QUOTA_BUDGET ?? 9200);
const TODAY = new Date().toISOString().slice(0, 10);

let quota = 0;
let searches = 0;
let raw = 0;
let detailCandidates = 0;
let playlistChecks = 0;
const failures = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function norm(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "");
}
function hasAny(text, words) {
  const n = norm(text);
  return words.some((word) => n.includes(norm(word)));
}
function cleanString(value) {
  return value.replace(
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
    "\uFFFD",
  );
}
function clean(value) {
  if (typeof value === "string") return cleanString(value);
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)]));
  return value;
}

async function yt(path, params, cost = 1) {
  if (quota + cost > QUOTA_BUDGET) {
    const error = new Error("local YouTube quota budget reached");
    error.code = "LOCAL_QUOTA_BUDGET";
    throw error;
  }
  quota += cost;
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  url.search = new URLSearchParams({ ...params, key: API_KEY }).toString();

  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (response.ok) return response.json();
    if (response.status === 429 || response.status >= 500) {
      await sleep(600 * 2 ** attempt);
      continue;
    }
    const body = await response.text().catch(() => "");
    const error = new Error(`YouTube ${path} returned ${response.status}: ${body.slice(0, 220)}`);
    error.status = response.status;
    throw error;
  }
  throw new Error(`YouTube ${path} failed after retries.`);
}

async function existingApprovedIds() {
  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return new Set();

  const all = [];
  for (let offset = 0; offset < 10000; offset += 1000) {
    const url = new URL("/rest/v1/approved_youtube_channels", base);
    url.search = new URLSearchParams({
      select: "channel_id",
      order: "created_at.asc",
      limit: "1000",
      offset: String(offset),
    }).toString();
    const response = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) break;
    const rows = await response.json();
    all.push(...rows);
    if (rows.length < 1000) break;
  }
  return new Set(all.map((row) => row.channel_id).filter(Boolean));
}

const FAITH = [
  "gospel","worship","praise","christian","jesus","christ","hymn","hymns","minstrel",
  "injili","sifa","ibada","bwana","mungu","yesu","ngai","nyasaye","mwathani","enkai","akuj","murungu",
  "évangile","evangile","chrétien","chretien","louange","adoration","jésus",
  "louvor","adoração","adoracao","cristão","cristao",
  "alabanza","adoración","adoracion","cristiano","jesús","lobpreis","anbetung",
  "pagsamba","kristiyano","praise and worship","worshipper","worshiper"
];

const MUSIC = [
  "music","musician","singer","artist","songwriter","recording artist","worship leader",
  "gospel artist","band","choir","chorale","vocalist","songs","music ministry","music minister",
  "musique","chanteur","chanteuse","artiste","música","musica","cantor","cantora","cantante","musik"
];

const BLOCK = [
  "dj ","dj-","mixtape","nonstop mix","mix vol","karaoke","lyrics channel",
  "news","politics","movie","film","trailer","comedy","radio station","television network",
  "record label","records official","distribution","music distributor","fan channel","reaction"
];

const SPOKEN = /\b(sermon|preaching|preacher|sunday service|church service|bible study|teaching|message|podcast|interview|testimony|conference|revival service|prayer meeting|morning devotion|evening devotion|livestream|live stream|news|reaction)\b/i;
const MUSIC_TITLE = /\b(official (?:music )?video|official audio|lyric video|lyrics video|visualizer|audio|music video|live recording|acoustic|song|worship|gospel|praise|jesus|yesu|mungu|bwana|hymn|louange|adoration|louvor|alabanza)\b/i;

function channelText(channel) {
  return [
    channel.snippet?.title,
    channel.snippet?.description,
    channel.brandingSettings?.channel?.keywords,
  ].filter(Boolean).join(" ");
}

function blockedChannel(channel) {
  const text = channelText(channel);
  const title = norm(channel.snippet?.title);
  if (hasAny(text, BLOCK)) return true;
  const org = /\b(church|cathedral|parish|diocese|chapel|mosque|news|tv|television|radio|network)\b/.test(title);
  if (org && !hasAny(text, ["music","choir","worship","singer","artist","band","songs"])) return true;
  return false;
}

function plausibleMusicTitle(title) {
  if (!title || SPOKEN.test(title)) return false;
  if (/\b(shorts compilation|behind the scenes|announcement|trailer|vlog|challenge)\b/i.test(title)) return false;
  return MUSIC_TITLE.test(title) || !/\b(service|sermon|teaching|podcast|interview)\b/i.test(title);
}

const REGION_SPECS = [
  ["Kenya","KE","en",["en","sw"]],["Uganda","UG","en",["en"]],["Tanzania","TZ","sw",["sw"]],
  ["Rwanda","RW","en",["en","rw"]],["Burundi","BI","fr",["fr"]],["Ethiopia","ET","en",["en"]],
  ["South Sudan","SS","en",["en"]],["Nigeria","NG","en",["en"]],["Ghana","GH","en",["en"]],
  ["South Africa","ZA","en",["en"]],["Zambia","ZM","en",["en"]],["Zimbabwe","ZW","en",["en"]],
  ["Malawi","MW","en",["en"]],["Botswana","BW","en",["en"]],["Namibia","NA","en",["en"]],
  ["Cameroon","CM","fr",["fr"]],["DR Congo","CD","fr",["fr"]],["Congo","CG","fr",["fr"]],
  ["Côte d'Ivoire","CI","fr",["fr"]],["Senegal","SN","fr",["fr"]],["Benin","BJ","fr",["fr"]],
  ["Togo","TG","fr",["fr"]],["Gabon","GA","fr",["fr"]],["Madagascar","MG","fr",["fr"]],
  ["Mozambique","MZ","pt",["pt"]],["Angola","AO","pt",["pt"]],["Brazil","BR","pt",["pt"]],
  ["United States","US","en",["en"]],["United Kingdom","GB","en",["en"]],["Canada","CA","en",["en"]],
  ["Australia","AU","en",["en"]],["New Zealand","NZ","en",["en"]],["Philippines","PH","en",["en"]],
  ["India","IN","en",["en"]],["Mexico","MX","es",["es"]],["Colombia","CO","es",["es"]],
  ["Argentina","AR","es",["es"]],["Chile","CL","es",["es"]],["Peru","PE","es",["es"]],
  ["Germany","DE","de",["de"]],["France","FR","fr",["fr"]],["Netherlands","NL","en",["en"]],
];

const KENYA_LOCAL = [
  ["Kikuyu gospel singer official music","KE","en",["ki"]],
  ["Kalenjin gospel singer official music","KE","en",["kln"]],
  ["Luo gospel singer official music","KE","en",["luo"]],
  ["Kamba gospel singer official music","KE","en",["kam"]],
  ["Luhya gospel singer official music","KE","en",["luy"]],
  ["Kisii gospel singer official music","KE","en",["guz"]],
  ["Maasai gospel singer worship music","KE","en",["mas"]],
  ["Meru gospel singer official music","KE","en",["mer"]],
];

function localizedQueries(name, lang) {
  if (lang === "fr") return [
    `${name} chanteur gospel officiel musique`,
    `${name} louange adoration musique chrétienne`,
  ];
  if (lang === "pt") return [
    `${name} cantor gospel oficial música`,
    `${name} louvor adoração música cristã`,
  ];
  if (lang === "es") return [
    `${name} cantante gospel música cristiana oficial`,
    `${name} alabanza adoración música cristiana`,
  ];
  if (lang === "de") return [
    `${name} christlicher Sänger Gospel Musik offiziell`,
    `${name} Lobpreis Anbetung christliche Musik`,
  ];
  return [
    `${name} gospel singer official music`,
    `${name} christian worship artist music`,
  ];
}

const specs = [];
for (const [name, region, lang, languages] of REGION_SPECS) {
  const [q1, q2] = localizedQueries(name, lang);
  specs.push({ q: q1, region, lang, languages, type: "channel", order: "relevance" });
  specs.push({ q: q2, region, lang, languages, type: "video", order: "date" });
}
for (const [q, region, lang, languages] of KENYA_LOCAL) {
  specs.unshift({ q, region, lang, languages, type: "video", order: "date" });
}

const existing = await existingApprovedIds();
const seen = new Set(existing);
const verified = [];
let stoppedReason = "query list exhausted";

async function discover(spec) {
  const page = await yt("search", {
    part: "snippet",
    q: spec.q,
    type: spec.type,
    maxResults: "50",
    safeSearch: "strict",
    order: spec.order,
    regionCode: spec.region,
    relevanceLanguage: spec.lang,
  }, 100);
  searches += 1;
  const ids = [...new Set((page.items ?? []).map((item) =>
    item.snippet?.channelId ?? item.id?.channelId
  ).filter(Boolean))].filter((id) => !seen.has(id));
  raw += ids.length;
  return ids;
}

async function fetchDetails(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const page = await yt("channels", {
      part: "snippet,statistics,contentDetails,topicDetails,brandingSettings",
      id: chunk.join(","),
      maxResults: "50",
    }, 1);
    out.push(...(page.items ?? []));
  }
  return out;
}

async function verifyChannel(channel, spec) {
  if (seen.has(channel.id)) return null;
  const videos = Number(channel.statistics?.videoCount ?? 0);
  const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
  if (videos < 4 || !uploads || blockedChannel(channel)) return null;

  const topicMusic = (channel.topicDetails?.topicCategories ?? []).some((v) =>
    /wikipedia\.org\/wiki\/Music/i.test(v)
  );
  const text = channelText(channel);
  const metadataFaith = hasAny(text, FAITH);
  const metadataMusic = topicMusic || hasAny(text, MUSIC);
  if (!metadataMusic) return null;

  detailCandidates += 1;
  playlistChecks += 1;
  const uploadsPage = await yt("playlistItems", {
    part: "snippet,contentDetails",
    playlistId: uploads,
    maxResults: "10",
  }, 1);

  const titles = (uploadsPage.items ?? [])
    .map((item) => item.snippet?.title ?? "")
    .filter(Boolean);
  const musicLike = titles.filter(plausibleMusicTitle);
  if (musicLike.length < 3) return null;

  const titleFaithHits = titles.filter((title) => hasAny(title, FAITH)).length;
  if (!metadataFaith && titleFaithHits < 2) return null;

  const sn = channel.snippet ?? {};
  return {
    name: sn.title?.trim() || channel.id,
    youtube_channel_id: channel.id,
    country: sn.country ?? spec.region ?? null,
    description: (sn.description ?? "").slice(0, 700) || null,
    avatar_url:
      sn.thumbnails?.high?.url ??
      sn.thumbnails?.medium?.url ??
      sn.thumbnails?.default?.url ??
      null,
    language_codes: spec.languages?.length ? spec.languages : ["und"],
    discovered_by: spec.q,
    discovery_mode: spec.type,
    sample_titles: musicLike.slice(0, 5),
    verified_at: TODAY,
    verification_basis:
      "YouTube channel metadata and recent uploads confirm a music-focused channel with Christian/gospel/worship evidence; blocked media, DJ/mix, spoken-programming, church-only and label sources are excluded.",
  };
}

outer:
for (const spec of specs) {
  if (verified.length >= TARGET_NEW) {
    stoppedReason = "target reached";
    break;
  }
  if (quota >= QUOTA_BUDGET - 150) {
    stoppedReason = "local YouTube quota budget reached";
    break;
  }

  let ids = [];
  try {
    ids = await discover(spec);
    if (!ids.length) continue;
    const details = await fetchDetails(ids);

    for (let i = 0; i < details.length; i += 8) {
      const chunk = details.slice(i, i + 8);
      let rows;
      try {
        rows = await Promise.all(chunk.map((channel) => verifyChannel(channel, spec)));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push({ query: spec.q, error: message });
        if (/quota|403|LOCAL_QUOTA_BUDGET/i.test(message)) {
          stoppedReason = message;
          break outer;
        }
        continue;
      }
      for (const row of rows) {
        if (!row || seen.has(row.youtube_channel_id)) continue;
        seen.add(row.youtube_channel_id);
        verified.push(row);
        if (verified.length >= TARGET_NEW) {
          stoppedReason = "target reached";
          break outer;
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push({ query: spec.q, error: message });
    if (/quota|403|LOCAL_QUOTA_BUDGET/i.test(message)) {
      stoppedReason = message;
      break;
    }
  }
}

const payload = clean({
  generated_at: new Date().toISOString(),
  target_new: TARGET_NEW,
  existing_approved_channel_ids_seen: existing.size,
  verified_new: verified.length,
  estimated_total_after_insert: existing.size + verified.length,
  quota_budget: QUOTA_BUDGET,
  quota_spent_estimate: quota,
  searches_run: searches,
  raw_unique_candidates: raw,
  detail_candidates: detailCandidates,
  playlist_checks: playlistChecks,
  stopped_reason: stoppedReason,
  failures,
  artists: verified,
});

await mkdir("public", { recursive: true });
await writeFile(
  "public/verified-artists-third-pass.json",
  JSON.stringify(payload, null, 2) + "\n",
);
console.log(
  `Third artist pass: verified ${verified.length} new channels; existing=${existing.size}; quota≈${quota}; searches=${searches}; stopped=${stoppedReason}`,
);
