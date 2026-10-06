import { mkdir, writeFile } from "node:fs/promises";

const WD_ENDPOINT = "https://query.wikidata.org/sparql";
const TODAY = new Date().toISOString().slice(0, 10);

const sparql = `
SELECT DISTINCT ?item ?itemLabel ?channel ?countryLabel WHERE {
  ?item wdt:P2397 ?channel.
  {
    ?item wdt:P106/wdt:P279* wd:Q63243029.
  }
  UNION
  {
    ?item wdt:P136/wdt:P279* ?genre.
    VALUES ?genre { wd:Q180268 wd:Q1379958 }
  }
  OPTIONAL { ?item wdt:P27 ?country. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 5000
`;

function stripTags(value) {
  return String(value ?? "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
}
function pickAll(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  return [...String(xml).matchAll(re)].map((m) => stripTags(m[1]));
}
const badTitle = /\\b(sermon|preaching|preacher|sunday service|church service|bible study|teaching|podcast|interview|conference|prayer meeting|livestream|live stream|reaction|news|trailer)\\b/i;

async function existingIds() {
  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return new Set();
  const ids = [];
  for (let offset = 0; offset < 10000; offset += 1000) {
    const url = new URL("/rest/v1/approved_youtube_channels", base);
    url.search = new URLSearchParams({
      select: "channel_id",
      order: "created_at.asc",
      limit: "1000",
      offset: String(offset),
    }).toString();
    const res = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) break;
    const rows = await res.json();
    ids.push(...rows.map((r) => r.channel_id).filter(Boolean));
    if (rows.length < 1000) break;
  }
  return new Set(ids);
}

const qUrl = new URL(WD_ENDPOINT);
qUrl.searchParams.set("query", sparql);
qUrl.searchParams.set("format", "json");
const wd = await fetch(qUrl, {
  headers: {
    Accept: "application/sparql-results+json",
    "User-Agent": "NuruFaithCatalog/1.0 (artist verification; https://nuru-faith.vercel.app)",
  },
  signal: AbortSignal.timeout(90000),
});
if (!wd.ok) throw new Error(`Wikidata query failed: ${wd.status} ${(await wd.text()).slice(0,300)}`);
const data = await wd.json();

const existing = await existingIds();
const raw = [];
for (const b of data.results?.bindings ?? []) {
  const channel = b.channel?.value;
  if (!channel || !/^UC[A-Za-z0-9_-]{22}$/.test(channel) || existing.has(channel)) continue;
  raw.push({
    wikidata_url: b.item?.value ?? null,
    name: b.itemLabel?.value ?? channel,
    youtube_channel_id: channel,
    country: b.countryLabel?.value ?? null,
  });
}
const unique = [...new Map(raw.map((x) => [x.youtube_channel_id, x])).values()];

async function verifyFeed(row) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(row.youtube_channel_id)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "NuruFaithCatalog/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const xml = await res.text();
    const titles = pickAll(xml, "media:title").slice(0, 15);
    if (titles.length < 3) return null;
    const bad = titles.filter((t) => badTitle.test(t)).length;
    if (bad >= Math.max(3, Math.ceil(titles.length * 0.5))) return null;
    const author = pickAll(xml, "name")[0] || row.name;
    return {
      ...row,
      name: author || row.name,
      sample_titles: titles.slice(0, 8),
      verified_at: TODAY,
      verification_basis:
        "Wikidata identifies this entity as a gospel musician or gospel/contemporary-Christian artist and provides its YouTube channel ID; the official YouTube channel feed resolves and has at least three recent uploads without a majority of spoken-programming signals.",
    };
  } catch {
    return null;
  }
}

const accepted = [];
const batchSize = 12;
for (let i = 0; i < unique.length; i += batchSize) {
  const batch = unique.slice(i, i + batchSize);
  const rows = await Promise.all(batch.map(verifyFeed));
  accepted.push(...rows.filter(Boolean));
}

await mkdir("public", { recursive: true });
const payload = {
  generated_at: new Date().toISOString(),
  source: "Wikidata P2397 + gospel musician/gospel or CCM genre + YouTube Atom feed",
  existing_approved_channels_seen: existing.size,
  wikidata_candidates_after_existing_dedupe: unique.length,
  verified_new: accepted.length,
  artists: accepted,
};
await writeFile("public/wikidata-gospel-artists.json", JSON.stringify(payload, null, 2) + "\n");
console.log(
  `Wikidata gospel pass: raw=${unique.length}, feed-verified=${accepted.length}, existing=${existing.size}`,
);
