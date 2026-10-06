import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const splash = readFileSync("src/components/nuru/SplashScreen.tsx", "utf8");
const styles = readFileSync("src/styles.css", "utf8");

test("opening uses only real curated Gen Z photos and the real Nuru brand", () => {
  assert.match(splash, /NuruGlyph/);
  assert.match(splash, /friends-outdoors\.jpg/);
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
  assert.match(splash, /const HOLD_MS = 2300/);
  assert.match(splash, /const MAX_MS = 4200/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test("opening only shows once per browser tab unless explicitly previewed", () => {
  assert.match(splash, /sessionStorage\.getItem\(SESSION_KEY\)/);
  assert.match(splash, /sessionStorage\.setItem\(SESSION_KEY, "1"\)/);
  assert.match(splash, /preview/);
});
