import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const splash = readFileSync("src/components/nuru/SplashScreen.tsx", "utf8");
const styles = readFileSync("src/styles.css", "utf8");

test("opening uses the real Nuru cross-in-arch brand and human photography", () => {
  assert.match(splash, /NuruGlyph/);
  assert.match(splash, /friends-outdoors\.jpg/);
  assert.match(splash, /Light for this generation/);
  assert.match(splash, /Find your people\. Grow in faith\. Live with purpose\./);
  assert.doesNotMatch(splash, /n<span/);
  assert.doesNotMatch(splash, /nuru-opening-stars/);
  assert.doesNotMatch(splash, /nuru-opening-orbit/);
  assert.doesNotMatch(splash, /PSALM 119:105/);
});

test("opening stays short and has a reduced-motion path", () => {
  assert.match(splash, /const HOLD_MS = 2100/);
  assert.match(splash, /const MAX_MS = 3400/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(styles, /nuru-opening-photo/);
  assert.match(styles, /nuru-opening-brandmark/);
});

test("opening only shows once per browser tab unless explicitly previewed", () => {
  assert.match(splash, /sessionStorage\.getItem\(SESSION_KEY\)/);
  assert.match(splash, /sessionStorage\.setItem\(SESSION_KEY, "1"\)/);
  assert.match(splash, /preview/);
});
