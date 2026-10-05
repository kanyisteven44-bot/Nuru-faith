/**
 * Screenshot Nuru's music player: the catalogue, the mini bar and the full
 * sheet, in whichever theme and width is asked for.
 *
 *   BASE=http://127.0.0.1:5201 THEME=dark WIDTH=390 node scripts/player-shots.mjs
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { installFixtures } from "./ui-fixtures.mjs";

const BASE = process.env.BASE ?? "http://127.0.0.1:5201";
const OUT = process.env.OUT ?? ".preview/player";
const THEME = process.env.THEME === "dark" ? "dark" : "light";
const WIDTH = Number(process.env.WIDTH ?? 390);
const HEIGHT = WIDTH >= 1024 ? 1000 : 844;
const EXE = process.env.PLAYWRIGHT_CHROMIUM ?? undefined;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2,
  colorScheme: THEME,
});
await context.addInitScript(
  ([theme]) => {
    try {
      sessionStorage.setItem("nuru-splash-shown", "1");
      localStorage.setItem("nuru-theme", theme);
    } catch {
      /* ignore */
    }
  },
  [THEME],
);

const page = await context.newPage();
await installFixtures(page);
// The embed itself cannot load here, and a dead iframe would hang the page
// load, so it is stubbed with a still frame. Nuru's own chrome is what this
// harness exists to check.
await page.route("**://www.youtube.com/**", (route) =>
  route.fulfill({ status: 200, contentType: "text/html", body: "<html><body></body></html>" }),
);
await page.route("**://www.youtube-nocookie.com/**", (route) =>
  route.fulfill({
    status: 200,
    contentType: "text/html",
    body: "<html><body style='margin:0;background:#11161d'></body></html>",
  }),
);

const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

const label = `${THEME}-${WIDTH}`;
const ROUTE = process.env.ROUTE ?? "/music";
const PREFIX = ROUTE === "/podcasts" ? "p" : "";
await page.goto(BASE + ROUTE, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(6000);
await page.screenshot({ path: `${OUT}/${PREFIX}01-catalogue-${label}.png` });

// Play the first song in the grid.
const firstSong = page.getByRole("button", { name: /^Play / }).first();
const found = await firstSong.count();
if (!found) {
  console.log("No playable song rendered — fixtures may not have reached the catalogue.");
} else {
  await firstSong.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${PREFIX}02-player-open-${label}.png` });

  // For the audio engine there is a real file behind this, so position must
  // actually advance — that is the difference between a drawn bar and a
  // working transport.
  if (ROUTE === "/podcasts") {
    const read = () =>
      page.evaluate(() => {
        const el = document.querySelector("audio");
        return el ? { t: el.currentTime, paused: el.paused, dur: el.duration } : null;
      });
    const before = await read();
    await page.waitForTimeout(3000);
    const after = await read();
    if (!before || !after) console.log("AUDIO: no audio element found");
    else
      console.log(
        `AUDIO: paused=${after.paused} position ${before.t.toFixed(2)}s -> ${after.t.toFixed(2)}s ` +
          `of ${Number.isFinite(after.dur) ? after.dur.toFixed(0) : "?"}s ` +
          `${after.t > before.t ? "ADVANCING" : "NOT ADVANCING"}`,
      );
  }

  // Minimise to the docked bar.
  const minimise = page.getByRole("button", { name: /Minimise the player/ });
  if (await minimise.count()) {
    await minimise.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${PREFIX}03-mini-bar-${label}.png` });
  }

  // Re-open and show the queue.
  const reopen = page.getByRole("button", { name: /Now playing:/ });
  if (await reopen.count()) {
    await reopen.click();
    await page.waitForTimeout(1000);
    const queue = page.getByRole("button", { name: /Show the queue/ });
    if (await queue.count()) {
      await queue.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${OUT}/${PREFIX}04-queue-${label}.png` });
    }
  }
}

await browser.close();
console.log(`captured into ${OUT}/ (${THEME}, ${WIDTH}px)`);
if (errors.length) console.log(`page errors:\n  ${errors.join("\n  ")}`);
