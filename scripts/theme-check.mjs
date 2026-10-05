/**
 * Exercises the theme the way a person does: open Settings with nothing
 * stored, click Dark, reload, and check what the very first paint looks like.
 *
 * Run the dev server with the preview bypass first:
 *
 *   VITE_PREVIEW_BYPASS=1 npx vite dev --port 5199 --host 127.0.0.1
 *   node scripts/theme-check.mjs
 *
 * Env:
 *   THEME_CHECK_BASE      dev server origin (default http://127.0.0.1:5199)
 *   PLAYWRIGHT_CHROMIUM   browser binary, when the bundled one doesn't match
 */
import { chromium } from "playwright";

const BASE = process.env.THEME_CHECK_BASE ?? "http://127.0.0.1:5199";
const EXE = process.env.PLAYWRIGHT_CHROMIUM ?? undefined;

const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: "light", // device says light, so "system" would resolve light
});
await context.addInitScript(() => {
  try {
    sessionStorage.setItem("nuru-splash-shown", "1");
  } catch {
    /* ignore */
  }
});
const page = await context.newPage();
const results = [];
const check = (name, pass, detail = "") => results.push({ name, pass, detail });

await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

// 1. Nothing stored + device light => light.
check(
  "defaults to light when device is light and nothing is stored",
  !(await page.evaluate(() => document.documentElement.classList.contains("dark"))),
);

// 2. Choosing Dark applies immediately.
await page.getByText("Always the dark theme").click();
await page.waitForTimeout(400);
check(
  "choosing Dark applies without a reload",
  await page.evaluate(() => document.documentElement.classList.contains("dark")),
);

// 3. It was written to storage.
const stored = await page.evaluate(() => localStorage.getItem("nuru-theme"));
check("the choice is written to localStorage", stored === "dark", `stored=${stored}`);

// 4. Survives a reload, and is dark on the FIRST paint — no flash of light.
//    The class is sampled before any stylesheet or framework script runs.
let firstPaintDark = null;
page.once("domcontentloaded", async () => {
  firstPaintDark = await page
    .evaluate(() => document.documentElement.classList.contains("dark"))
    .catch(() => null);
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1500);
check(
  "survives a reload",
  await page.evaluate(() => document.documentElement.classList.contains("dark")),
);
check(
  "is already dark at DOMContentLoaded (no flash)",
  firstPaintDark === true,
  `saw=${firstPaintDark}`,
);

// 5. Survives a brand new page in the same profile — i.e. an app restart.
const page2 = await context.newPage();
await page2.goto(`${BASE}/home`, { waitUntil: "networkidle" });
await page2.waitForTimeout(1200);
check(
  "survives opening the app fresh",
  await page2.evaluate(() => document.documentElement.classList.contains("dark")),
);
// The status-bar colour should follow too.
const meta = await page2.getAttribute('meta[name="theme-color"]', "content");
check("theme-color meta follows the theme", meta === "#14161A", `meta=${meta}`);

// 6. "Use device setting" follows the device.
await page2.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
await page2.waitForTimeout(1200);
await page2.getByText("Follow your phone or computer").click();
await page2.waitForTimeout(400);
check(
  "device setting resolves to light while the device is light",
  !(await page2.evaluate(() => document.documentElement.classList.contains("dark"))),
);
await page2.emulateMedia({ colorScheme: "dark" });
await page2.waitForTimeout(500);
check(
  "device setting follows the device flipping to dark, live",
  await page2.evaluate(() => document.documentElement.classList.contains("dark")),
);

// 7. The radio group is reachable and operable from the keyboard, and the
//    focused row shows a visible ring.
await page2.emulateMedia({ colorScheme: "light" });
await page2.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
await page2.waitForTimeout(1200);
await page2.evaluate(() => {
  document.querySelector('input[name="theme"][value="light"]')?.focus();
});
check(
  "a theme radio can take keyboard focus",
  await page2.evaluate(() => document.activeElement?.getAttribute("name") === "theme"),
);
const ringVisible = await page2.evaluate(() => {
  const input = document.activeElement;
  const row = input?.closest("label");
  if (!row) return false;
  // focus-within paints the ring on the row via box-shadow.
  const shadow = getComputedStyle(row).boxShadow;
  return shadow !== "none" && shadow !== "";
});
check("the focused row shows a visible focus ring", ringVisible);
await page2.keyboard.press("ArrowDown");
await page2.waitForTimeout(400);
check(
  "arrow keys move the theme selection",
  await page2.evaluate(() => document.documentElement.classList.contains("dark")),
);

await browser.close();

let failed = 0;
for (const r of results) {
  if (!r.pass) failed += 1;
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exitCode = failed ? 1 : 0;
