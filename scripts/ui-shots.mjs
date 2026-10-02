/**
 * Screenshot every screen against the real components.
 *
 * Starts nothing itself — run the dev server with the preview bypass first:
 *
 *   VITE_PREVIEW_BYPASS=1 npx vite dev --port 5199 --host 127.0.0.1
 *   node scripts/ui-shots.mjs
 *
 * The bypass only works in a dev build (see src/routes/_authenticated/route.tsx),
 * so this can never reach production. Screens render with queries disabled
 * because there is no signed-in user, which is fine for checking layout and
 * colour but means data-backed lists show their empty or loading state.
 *
 * Env:
 *   SHOTS_BASE   dev server origin          (default http://127.0.0.1:5199)
 *   SHOTS_OUT    output directory           (default .preview)
 *   SHOTS_ONLY   comma-separated screen ids (default all)
 *   SHOTS_THEME  light | dark               (default light)
 *   SHOTS_WIDTH  viewport width in px       (default 390; 1440 for desktop)
 *   SHOTS_FIXTURES=1  serve placeholder rows instead of hitting Supabase, so
 *                     populated layouts can be reviewed on a machine that
 *                     cannot reach the database. Never used by the app.
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { installFixtures } from "./ui-fixtures.mjs";

const BASE = process.env.SHOTS_BASE ?? "http://127.0.0.1:5199";
const OUT = process.env.SHOTS_OUT ?? ".preview";
const ONLY = process.env.SHOTS_ONLY?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const THEME = process.env.SHOTS_THEME === "dark" ? "dark" : "light";
const WIDTH = Number(process.env.SHOTS_WIDTH ?? 390);
const HEIGHT = WIDTH >= 1024 ? 900 : 844;

/** Chromium that ships with the image, when the bundled version doesn't match. */
const EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM ?? undefined;

const SCREENS = [
  ["home", "/home"],
  ["library", "/library"],
  ["prayer", "/prayer"],
  ["bible", "/bible"],
  ["devotionals", "/devotionals"],
  ["series", "/series"],
  ["community", "/community"],
  ["church", "/church"],
  ["events", "/events"],
  ["reels", "/reels"],
  ["music", "/music"],
  ["mentors", "/mentors"],
  ["profile", "/profile"],
  ["explore", "/explore"],
  ["notifications", "/notifications"],
  ["settings", "/settings"],
  ["grow", "/grow"],
  ["create", "/create"],
];

const screens = ONLY ? SCREENS.filter(([id]) => ONLY.includes(id)) : SCREENS;

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2,
  colorScheme: THEME,
});
// Skip the opening on these — it is captured separately with its own timings.
// The theme is written to storage under the same key the app reads, so the
// blocking head script picks it up and the page paints in the right theme
// from the very first frame — the same path a real visitor takes.
await context.addInitScript(
  ([theme]) => {
    try {
      sessionStorage.setItem("nuru-splash-shown", "1");
    } catch {
      /* private mode — the opening simply plays */
    }
    try {
      localStorage.setItem("nuru-theme", theme);
    } catch {
      /* storage blocked — the app falls back to the device setting */
    }
  },
  [THEME],
);

const page = await context.newPage();
if (process.env.SHOTS_FIXTURES) {
  await installFixtures(page);
  console.log("serving placeholder fixture rows — nothing here is real data\n");
}
const failures = [];
page.on("pageerror", (e) => failures.push(`  page error: ${String(e).slice(0, 160)}`));

// The first navigation pays for a cold Vite compile; do it before timing anything.
await page.goto(`${BASE}/home`, { waitUntil: "networkidle" }).catch(() => {});
await page.waitForTimeout(5000);

let empty = 0;
for (const [id, route] of screens) {
  try {
    await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2500);
    await page.evaluate(() => document.fonts.ready);
    const text = (
      await page
        .locator("body")
        .innerText()
        .catch(() => "")
    ).trim();
    // Verify the theme really landed, rather than trusting that it did.
    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    if (isDark !== (THEME === "dark")) {
      failures.push(`  ${id}: expected ${THEME} theme, got ${isDark ? "dark" : "light"}`);
    }
    await page.screenshot({ path: `${OUT}/${id}.png` });
    if (!text) empty += 1;
    console.log(
      `${id.padEnd(14)} ${route.padEnd(16)} ${text ? `${text.length} chars` : "EMPTY"} ${
        isDark ? "dark" : "light"
      }`,
    );
  } catch (e) {
    empty += 1;
    console.log(`${id.padEnd(14)} ${route.padEnd(16)} FAILED ${String(e).slice(0, 100)}`);
  }
}

await browser.close();
if (failures.length) console.log("\n" + failures.join("\n"));
console.log(
  `\n${screens.length - empty}/${screens.length} captured into ${OUT}/ (${THEME}, ${WIDTH}px)`,
);
// A blank screen is a real failure, not a slow render — fail the run so it is noticed.
if (empty > 0) process.exitCode = 1;
