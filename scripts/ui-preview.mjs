/**
 * Screenshot every screen of the app, signed in as a real account.
 *
 * This deliberately does NOT stub Supabase. An earlier version faked the
 * database with hand-written fixtures, and every one of its failures came from
 * that: the fake JWT stopped parsing after a supabase-js upgrade, `reels: []`
 * rendered an error state, `head: true` counts read zero because the stub
 * dropped `content-range`, and `.neq` was ignored because only `eq` and `in`
 * were implemented. Fixtures also rot the moment anyone adds a table. Pointing
 * at a running app with a real test account removes all of that at once.
 *
 *   PREVIEW_BASE      where the app is running
 *                     (default http://127.0.0.1:4321; in CI, the preview URL)
 *   PREVIEW_EMAIL     test account to sign in as — required for app screens
 *   PREVIEW_PASSWORD  its password
 *   PREVIEW_SCREENS   optional JSON: [["name","/route"], ...]
 *   PREVIEW_FULLPAGE  "1" captures the whole page instead of one viewport
 *   PREVIEW_OUT       output directory (default .preview)
 *
 * Use an account created only for this, whose data does not change, so
 * screenshots stay comparable between runs. Never put real credentials in the
 * repo — pass them in the environment.
 *
 *   npx vite dev --port 4321 &
 *   PREVIEW_EMAIL=… PREVIEW_PASSWORD=… node scripts/ui-preview.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = (process.env["PREVIEW_BASE"] ?? "http://127.0.0.1:4321").replace(/\/$/, "");
const EMAIL = process.env["PREVIEW_EMAIL"] ?? "";
const PASSWORD = process.env["PREVIEW_PASSWORD"] ?? "";
const OUT = process.env["PREVIEW_OUT"] ?? process.argv[2] ?? ".preview";
const FULLPAGE = process.env["PREVIEW_FULLPAGE"] === "1";

/** Chromium is preinstalled in CI images at a known path; fall back to Playwright's own. */
const EXECUTABLE = process.env["PLAYWRIGHT_CHROMIUM_PATH"] ?? "/opt/pw-browsers/chromium";

const DEFAULT_SCREENS = [
  ["01-home", "/home"],
  ["02-explore", "/explore"],
  ["03-devotionals", "/devotionals"],
  ["04-series", "/series"],
  ["05-bible", "/bible"],
  ["06-music", "/music"],
  ["07-nuru-ai", "/ai"],
  ["08-community", "/community"],
  ["09-groups", "/groups"],
  ["10-mentors", "/mentors"],
  ["11-events", "/events"],
  ["12-church", "/church"],
  ["13-profile", "/profile"],
  ["14-settings", "/settings"],
  ["15-serve", "/serve"],
  ["16-notifications", "/notifications"],
  ["17-messages", "/messages"],
  ["18-create", "/create"],
  ["19-reels", "/reels"],
  ["20-hub", "/hub"],
];

const SCREENS = JSON.parse(process.env["PREVIEW_SCREENS"] ?? "null") ?? DEFAULT_SCREENS;

await fs.mkdir(OUT, { recursive: true });

let executablePath;
try {
  await fs.access(EXECUTABLE);
  executablePath = EXECUTABLE;
} catch {
  executablePath = undefined; // let Playwright resolve its own download
}

const browser = await chromium.launch(executablePath ? { executablePath } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

const problems = [];
page.on("pageerror", (e) => problems.push(`[pageerror] ${e.message.split("\n")[0]}`));

/**
 * The splash overlay covers the app for up to ~1.5s on the first load of a tab,
 * and React has to hydrate before any route renders. Waiting for both means a
 * screenshot is never taken of a half-built screen — the blank first frame this
 * script used to produce was a cold Vite compile, not an empty page.
 */
async function settle() {
  await page
    .waitForFunction(
      () => {
        const splash = document.querySelector('[data-testid="nuru-splash"]');
        if (splash) return false;
        return document.body.innerText.trim().length > 0;
      },
      null,
      { timeout: 30000 },
    )
    .catch(() => {});
  await page.waitForTimeout(700);
}

async function signIn() {
  if (!EMAIL || !PASSWORD) {
    console.log("! PREVIEW_EMAIL / PREVIEW_PASSWORD not set — capturing signed-out screens only");
    return false;
  }
  await page.goto(`${BASE}/auth?mode=login`, { waitUntil: "domcontentloaded" });
  await settle();

  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.getByRole("button", { name: /^Sign In$/ }).click();

  // Signing in leaves /auth; if it does not, the credentials were rejected.
  try {
    await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 25000 });
  } catch {
    throw new Error(
      "Sign-in did not complete — check PREVIEW_EMAIL / PREVIEW_PASSWORD and that the account exists.",
    );
  }
  await settle();
  console.log(`✓ signed in as ${EMAIL}`);
  return true;
}

// Warm-up: the very first navigation of a dev server pays for compiling the
// route, which used to land in the first screenshot.
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" }).catch(() => {});
await settle();

await signIn();

let failed = 0;
for (const [name, route] of SCREENS) {
  try {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 });
    await settle();
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: FULLPAGE });

    // A screen that rendered nothing is a failure worth reporting, not a file.
    const text = (await page.evaluate(() => document.body.innerText)).trim();
    if (text.length < 5) {
      failed += 1;
      console.log(`EMPTY ${name} -> ${page.url()}`);
    } else {
      console.log(`OK    ${name} -> ${page.url()}`);
    }
  } catch (e) {
    failed += 1;
    console.log(`FAIL  ${name} -> ${String(e.message).split("\n")[0]}`);
  }
}

await browser.close();

if (problems.length) {
  console.log(`\n${problems.length} page error(s):`);
  for (const p of [...new Set(problems)].slice(0, 10)) console.log("  " + p);
}
console.log(`\n${SCREENS.length - failed}/${SCREENS.length} screens captured into ${OUT}/`);
if (failed) process.exitCode = 1;
