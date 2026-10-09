import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const splash = readFileSync("src/components/nuru/SplashScreen.tsx", "utf8");
const styles = readFileSync("src/styles.css", "utf8");
const openingImage = readFileSync("src/lib/openingImage.ts", "utf8");

test("opening uses only real curated Gen Z photos and the real Nuru brand", () => {
  assert.match(splash, /NuruGlyph/);
  assert.match(splash, /OPENING_IMAGE_SRC/);
  assert.match(openingImage, /friends-outdoors-v1-1600\.webp/);
  assert.match(splash, /worship-gathering\.jpg/);
  assert.match(splash, /prayer-community\.jpg/);
  assert.match(splash, /OPENING_PHOTOS/);
  assert.doesNotMatch(splash, /Light for this generation/);
  assert.doesNotMatch(splash, /Find your people/);
  assert.doesNotMatch(splash, /PSALM 119:105/);
  assert.doesNotMatch(splash, /Skip/);
});

test("opening shows an app-loading indicator while auth restores", () => {
  assert.match(splash, /Opening Nuru Faith/);
  assert.match(splash, /nuru-opening-loader-track/);
  assert.match(splash, /nuru-opening-loader-bar/);
  assert.match(styles, /@keyframes nuru-opening-loader/);
  assert.match(styles, /nuru-opening-photo-active/);
});

test("opening stays short and supports reduced motion", () => {
  assert.ok(Number(splash.match(/const HOLD_MS = (\d+)/)[1]) <= 1000);
  assert.ok(Number(splash.match(/const MAX_MS = (\d+)/)[1]) <= 2000);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test("opening only shows once per browser tab unless explicitly previewed", () => {
  assert.match(splash, /sessionStorage\.getItem\(SESSION_KEY\)/);
  assert.match(splash, /sessionStorage\.setItem\(SESSION_KEY, "1"\)/);
  assert.match(splash, /preview/);
});

test("installed app avoids a second opening and inactive rotating photos stay deferred", () => {
  const root = readFileSync("src/routes/__root.tsx", "utf8");
  const index = readFileSync("src/routes/index.tsx", "utf8");
  assert.match(splash, /display-mode: standalone/);
  assert.match(splash, /navigator as Navigator/);
  assert.match(splash, /stage === "gone" \|\| stage === "pending"/);
  assert.match(splash, /src=\{index <= photoIndex \? src : undefined\}/);
  // Only entry and explicit replay preload the first opening photograph.
  assert.doesNotMatch(root, /SplashScreen/);
  const opening = readFileSync("src/routes/opening.tsx", "utf8");
  assert.match(opening, /<SplashScreen key=\{attempt\} preview/);
  assert.match(index, /<SplashScreen initialOnly onComplete=/);
  assert.match(splash, /completionRef\.current\?\.\(\)/);
});

test("intro has a working dismiss action without extending its opening timeout", () => {
  assert.match(splash, /onClick=\{finish\}/);
  assert.match(splash, />\s*Continue <ArrowRight/);
  assert.match(splash, /const MAX_MS = 1800/);
});
