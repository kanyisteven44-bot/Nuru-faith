/**
 * Checks that the deployed production bundle actually contains the UI merged
 * into main.
 *
 * Lazy route chunks are only named by the server-side router manifest, so they
 * cannot be discovered by crawling the public entry chunk. Instead this builds
 * the current checkout, finds which emitted asset holds each marker string,
 * and asks production for that exact filename. Vite asset names carry a content
 * hash, so a 200 that still contains the marker means production is serving a
 * build made from this code; a 404 means production is serving something else.
 *
 * Usage: npm run build && node scripts/verify-production-build.mjs [baseUrl]
 */
import fs from "node:fs/promises";
import path from "node:path";

const BASE = (process.argv[2] ?? "https://nuru-faith-vortiqora.vercel.app").replace(/\/$/, "");
const ASSET_DIR = ".output/public/assets";

/** Marker string -> the change it proves is deployed. */
const MARKERS = {
  "Quick Devotions": "Devotionals screen rebuild",
  "Real Faith. Brighter Days": "Shared feature header",
  "Made for You": "Series screen rebuild",
  "Mentorship requested": "Mentor detail screen",
  "Continue with Google": "Google sign-in button",
  "Copy link": "Share sheet",
  "topic-faith": "Topic photo assets",
};

let files;
try {
  files = (await fs.readdir(ASSET_DIR)).filter((f) => f.endsWith(".js"));
} catch {
  console.error(`No build found at ${ASSET_DIR}. Run "npm run build" first.`);
  process.exit(1);
}

// Map each marker to the local chunk that carries it.
const localChunk = new Map();
for (const file of files) {
  const body = await fs.readFile(path.join(ASSET_DIR, file), "utf8");
  for (const marker of Object.keys(MARKERS)) {
    if (!localChunk.has(marker) && body.includes(marker)) localChunk.set(marker, file);
  }
}

async function probe(url) {
  try {
    const res = await fetch(url);
    return {
      status: res.status,
      body: res.status === 200 ? await res.text() : "",
      headers: res.headers,
    };
  } catch (err) {
    return { status: 0, body: "", headers: new Headers(), error: err?.message ?? String(err) };
  }
}

const index = await probe(BASE + "/");
console.log(`GET ${BASE}/ -> ${index.status}${index.error ? " " + index.error : ""}`);
console.log(`vercel id: ${index.headers.get("x-vercel-id") ?? "n/a"}`);
if (index.status !== 200) {
  console.error("Production is not reachable from here; cannot verify.");
  process.exit(1);
}

console.log("\n--- marker report ---");
let missing = 0;
let unbuilt = 0;
for (const [marker, change] of Object.entries(MARKERS)) {
  const file = localChunk.get(marker);
  if (!file) {
    unbuilt += 1;
    console.log(`NOT BUILT  ${change} ("${marker}") is not in this checkout's build`);
    continue;
  }
  const res = await probe(`${BASE}/assets/${file}`);
  if (res.status === 200 && res.body.includes(marker)) {
    console.log(`DEPLOYED   ${change} -> /assets/${file}`);
  } else {
    missing += 1;
    console.log(`STALE      ${change} -> /assets/${file} returned ${res.status}`);
  }
}

const total = Object.keys(MARKERS).length;
console.log(`\n${total - missing - unbuilt}/${total} markers deployed at ${BASE}`);
if (missing > 0) {
  console.log("Production is serving an older build than this checkout.");
}
process.exit(missing + unbuilt === 0 ? 0 : 1);
