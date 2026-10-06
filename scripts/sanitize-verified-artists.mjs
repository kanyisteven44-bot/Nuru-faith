import { mkdir, writeFile } from "node:fs/promises";

const SOURCE =
  process.env.NURU_VERIFIED_ARTIST_SOURCE ||
  "https://nuru-faith-3r46voayb-vortiqora.vercel.app/verified-artists.json";

const response = await fetch(SOURCE, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`Could not fetch verified artist source: ${response.status}`);
const payload = await response.json();

function obviousJunk(title) {
  const t = String(title ?? "").trim();
  if (!t) return true;
  if (/^(?:\d{1,2}[\/.-])?\d{1,2}[\/.-]\d{2,4}$/.test(t)) return true;
  if (/^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:,\s*\d{4})?$/i.test(t)) return true;
  if (/\bis live\b/i.test(t)) return true;
  if (/#(?:comedy|motivation|food|duet|lifeisbutadream|viral|tiktok)\b/i.test(t)) return true;
  if (/\b(sermon|preaching|sunday service|church service|bible study|teaching|podcast|interview|prayer meeting|life history|what happened at)\b/i.test(t)) return true;
  return false;
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

const before = payload.artists ?? [];
const accepted = before.filter((artist) => {
  const titles = artist.sample_titles ?? [];
  const junk = titles.filter(obviousJunk).length;
  return !(titles.length >= 3 && junk >= 2);
});
const out = clean({
  ...payload,
  raw_verified_before_quality_filter: before.length,
  quality_rejected: before.length - accepted.length,
  verified_new: accepted.length,
  artists: accepted,
  sanitized_for_postgres: true,
});
await mkdir("public", { recursive: true });
await writeFile("public/verified-artists.json", JSON.stringify(out, null, 2) + "\n");
console.log(
  `Sanitized artist audit: ${before.length} raw, ${accepted.length} accepted, ${before.length - accepted.length} rejected.`,
);
