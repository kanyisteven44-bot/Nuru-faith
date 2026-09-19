/**
 * Checks whether the deployed site is serving a build that contains the image
 * assets in this checkout.
 *
 * It deliberately does NOT compare JavaScript chunk filenames. Vite inlines
 * VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY into the client bundle,
 * so a build made without the production values produces different content
 * hashes for most JS chunks even when the source is identical — changing only
 * the key renames 87 of the 118 files emitted here. Comparing JS names across
 * environments therefore says nothing about whether a deployment is stale.
 *
 * Image assets are hashed from file content alone, so their names are stable
 * across build environments and are a sound signal. Images only change when
 * artwork does, though, so the probe also reads the server-rendered splash
 * copy, which changes whenever that screen's markup does.
 *
 * Usage: npm run build && node scripts/verify-production-build.mjs [baseUrl]
 */
import fs from "node:fs/promises";

const BASE = (process.argv[2] ?? "https://nuru-faith-vortiqora.vercel.app").replace(/\/$/, "");
const ASSET_DIR = ".output/public/assets";

/** An image that predates the recent work, proving the probe itself lines up. */
const CONTROL = /^mountain-dawn-/;
/** Images added by the recent UI work; present only if that work is deployed. */
const RECENT = /^topic-/;

let files;
try {
  files = await fs.readdir(ASSET_DIR);
} catch {
  console.error(`No build found at ${ASSET_DIR}. Run "npm run build" first.`);
  process.exit(1);
}

const images = files.filter((f) => /\.(jpg|png|webp)$/.test(f));
const control = images.filter((f) => CONTROL.test(f));
const recent = images.filter((f) => RECENT.test(f));

if (control.length === 0 || recent.length === 0) {
  console.error("This checkout has no control or recent images to compare; nothing to verify.");
  process.exit(1);
}

async function status(path) {
  try {
    const res = await fetch(BASE + path);
    return res.status;
  } catch (err) {
    return `error: ${err?.message ?? String(err)}`;
  }
}

const root = await status("/");
console.log(`GET ${BASE}/ -> ${root}`);
if (root !== 200) {
  console.error("Production is not reachable from here; cannot verify.");
  process.exit(1);
}

// The splash route is server-rendered, so its copy appears in the HTML and
// moves with the deployed source rather than with the build environment.
const SPLASH_MARKER = "A BRIGHTER YOU.";
const home = await fetch(BASE + "/").then((r) => r.text());
const splashDeployed = home.includes(SPLASH_MARKER);
console.log(
  `\n--- server-rendered splash ---\n${splashDeployed ? "present" : "MISSING"}  "${SPLASH_MARKER}" in the HTML at /`,
);

console.log("\n--- control images (should already be deployed) ---");
let controlOk = 0;
for (const f of control) {
  const code = await status(`/assets/${f}`);
  if (code === 200) controlOk += 1;
  console.log(`${code === 200 ? "present" : "MISSING"}  /assets/${f} -> ${code}`);
}

if (controlOk === 0) {
  console.error("\nNo control image is served, so asset paths differ here; the probe is unsound.");
  process.exit(1);
}

console.log("\n--- images added by the recent UI work ---");
let missing = 0;
for (const f of recent) {
  const code = await status(`/assets/${f}`);
  if (code !== 200) missing += 1;
  console.log(`${code === 200 ? "present" : "MISSING"}  /assets/${f} -> ${code}`);
}

console.log(
  `\n${recent.length - missing}/${recent.length} recent images deployed at ${BASE}` +
    (missing === 0
      ? " — production carries this checkout's assets."
      : " — production is serving a build without them."),
);
if (!splashDeployed) {
  console.log("The current splash copy is not being served, so this build is not live yet.");
}
process.exit(missing === 0 && splashDeployed ? 0 : 1);
