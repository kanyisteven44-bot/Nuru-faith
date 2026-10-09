/** Real Chromium mobile QA against the pull request's deployed preview.
 * No credentials, Supabase writes or other user accounts are touched.
 */
import { chromium } from "playwright";

const origin = (process.env.NURU_INTRO_URL || "").replace(/\/$/, "");
if (!/^https:\/\/[-a-zA-Z0-9.]+$/.test(origin)) {
  throw new Error("Configure NURU_INTRO_URL with the exact HTTPS preview host.");
}

const widths = [320, 360, 375, 390, 412, 430];
const browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage"] });
let failures = 0;

try {
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 780 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 1,
      locale: "en-KE",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message.slice(0, 180)));
    try {
      // A PR preview can be deployed after its CI job starts; require the new
      // heading rather than accidentally validating the preceding build.
      let loaded = false;
      for (let attempt = 0; attempt < 12; attempt++) {
        await page.goto(origin + "/welcome", { waitUntil: "domcontentloaded", timeout: 30000 });
        try {
          await page.getByText("Real people.", { exact: false }).first().waitFor({ state: "visible", timeout: 5000 });
          loaded = true;
          break;
        } catch {
          await page.waitForTimeout(8000);
        }
      }
      if (!loaded) throw new Error("New intro was not available on the preview.");

      const first = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        imageReady: [...document.images].some((img) => img.complete && img.naturalWidth > 0 && img.src.includes("friends-outdoors")),
      }));
      if (first.overflow > 1) throw new Error("Horizontal overflow: " + first.overflow);
      if (!first.imageReady) {
        await page.locator("img").first().waitFor({ state: "attached" });
        await page.waitForTimeout(1200);
      }

      await page.getByRole("button", { name: "Continue", exact: true }).click({ timeout: 10000 });
      await page.getByText("You are loved.", { exact: false }).first().waitFor({ timeout: 9000 });
      const second = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        getStarted: [...document.querySelectorAll("button")].some((button) => button.textContent?.includes("Get started")),
      }));
      if (second.overflow > 1 || !second.getStarted) throw new Error("Second intro overflows or its action is missing.");

      await page.getByRole("button", { name: "Get started" }).click({ timeout: 10000 });
      await page.waitForURL((url) => url.pathname === "/auth" && url.searchParams.get("mode") === "signup", { timeout: 16000 });
      const flag = await page.evaluate(() => localStorage.getItem("nuru-faith-intro-v1-completed"));
      if (flag !== "1") throw new Error("Intro completion was not persisted.");

      // Returning signed-out visitors should never re-enter the full intro.
      await page.goto(origin + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForURL((url) => url.pathname === "/auth", { timeout: 16000 });
      if (errors.length) throw new Error("Uncaught browser exceptions: " + errors.join(" | "));
      console.log("INTRO_BROWSER_PASS " + JSON.stringify({ width, first, second, persisted: true, returnRoute: "/auth" }));
    } catch (error) {
      failures++;
      console.error("INTRO_BROWSER_FAIL " + JSON.stringify({ width, error: String(error).slice(0, 400), browserErrors: errors.slice(0, 5), url: page.url() }));
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
console.log("INTRO_BROWSER_RESULT " + JSON.stringify({ widths, failures }));
if (failures) process.exitCode = 1;
