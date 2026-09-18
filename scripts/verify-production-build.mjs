/**
 * Checks that the deployed production bundle actually contains the UI that is
 * merged into main. It walks the client entry chunk (which references every
 * lazy route chunk by filename) and greps the downloaded chunks for marker
 * strings. No auth needed — the markers live in the JavaScript, not behind the
 * login wall.
 *
 * Run locally or in CI: node scripts/verify-production-build.mjs [baseUrl]
 */
const BASE = (process.argv[2] ?? "https://nuru-faith-vortiqora.vercel.app").replace(/\/$/, "");

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

async function get(url) {
  const res = await fetch(url, { redirect: "follow" });
  return { status: res.status, url: res.url, headers: res.headers, body: await res.text() };
}

const index = await get(BASE + "/");
console.log(`GET ${BASE}/ -> ${index.status} (${index.url})`);
console.log(`vercel id: ${index.headers.get("x-vercel-id") ?? "n/a"}`);
console.log(
  `age: ${index.headers.get("age") ?? "n/a"}  cache: ${index.headers.get("x-vercel-cache") ?? "n/a"}`,
);

if (index.status !== 200) {
  console.error("Production did not return 200 for /. Cannot verify.");
  process.exit(1);
}

const entryPaths = [
  ...new Set([...index.body.matchAll(/\/assets\/[A-Za-z0-9._-]+\.js/g)].map((m) => m[0])),
];
console.log(`entry chunks referenced by the HTML: ${entryPaths.join(", ") || "(none)"}`);

// The entry chunk names every lazy route chunk, so one hop gives the whole graph.
const chunkPaths = new Set(entryPaths);
for (const entry of entryPaths) {
  const chunk = await get(BASE + entry);
  for (const m of chunk.body.matchAll(/\/assets\/[A-Za-z0-9._-]+\.js/g)) chunkPaths.add(m[0]);
}
console.log(`chunks discovered: ${chunkPaths.size}`);

const found = new Map(Object.keys(MARKERS).map((k) => [k, null]));
for (const path of chunkPaths) {
  const chunk = await get(BASE + path);
  if (chunk.status !== 200) continue;
  for (const marker of found.keys()) {
    if (found.get(marker) === null && chunk.body.includes(marker)) found.set(marker, path);
  }
}

console.log("\n--- marker report ---");
let missing = 0;
for (const [marker, change] of Object.entries(MARKERS)) {
  const where = found.get(marker);
  if (where) {
    console.log(`PRESENT  ${change} ("${marker}") in ${where}`);
  } else {
    missing += 1;
    console.log(`MISSING  ${change} ("${marker}")`);
  }
}

console.log(
  `\n${Object.keys(MARKERS).length - missing}/${Object.keys(MARKERS).length} markers present at ${BASE}`,
);
process.exit(missing === 0 ? 0 : 1);
