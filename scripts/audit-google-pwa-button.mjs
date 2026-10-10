import { chromium } from "playwright";

// Smoke test public sign-in UI only. No credentials or accounts are touched.
// Simulated display-mode does not replace a genuine Android install test.
const cases = [
  { origin: "https://app.nurufaith.co.ke", installed: true, expect: "embedded" },
  { origin: "https://app.nurufaith.co.ke", installed: false, expect: "browser" },
  { origin: "https://nurufaith.website", installed: true, expect: "browser" },
];
const browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage"] });
let failures = 0;

for (const testCase of cases) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
  });
  const page = await context.newPage();
  const errors = [];
  if (testCase.installed) {
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = (query) => {
        if (query === "(display-mode: standalone)") {
          return {
            matches: true, media: query,
            addListener() {}, removeListener() {},
            addEventListener() {}, removeEventListener() {},
            dispatchEvent() { return true; }, onchange: null,
          };
        }
        return original(query);
      };
    });
  }
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 240)));
  page.on("console", (m) => {
    if (m.type() === "error" && /google|origin|credential|fedcm|gsi|content.security/i.test(m.text())) {
      errors.push(m.text().slice(0, 240));
    }
  });
  try {
    await page.goto(testCase.origin + "/auth?mode=login", {
      waitUntil: "domcontentloaded", timeout: 45000,
    });
    // Give the client hydration and GIS SDK time to render.
    if (testCase.expect === "embedded") {
      await page.locator('[aria-label="Continue with Google inside Nuru Faith"]')
        .waitFor({ state: "visible", timeout: 25000 });
    } else {
      await page.getByRole("button", { name: "Continue with Google", exact: true })
        .waitFor({ state: "visible", timeout: 25000 });
    }
    await page.waitForTimeout(6500);
    const actual = await page.evaluate(() => {
      const container = document.querySelector('[aria-label="Continue with Google inside Nuru Faith"]');
      const browser = [...document.querySelectorAll("button")].find(
        (node) => node.textContent?.includes("Continue with Google"),
      );
      return {
        host: location.hostname,
        embedded: !!container && container.getBoundingClientRect().width > 100,
        buttonElements: container?.childElementCount ?? 0,
        googleFrames: container?.querySelectorAll("iframe").length ?? 0,
        fallback: document.body.innerText.includes("Use browser sign-in"),
        browserButton: !!browser && !browser.disabled && browser.getBoundingClientRect().width > 100,
      };
    });
    const official = testCase.origin.endsWith(".co.ke");
    const originError = errors.some(e => /origin is not allowed for the given client id/i.test(e));
    const good = actual.host === new URL(testCase.origin).hostname &&
      (testCase.expect === "embedded"
        ? actual.embedded && actual.fallback && actual.buttonElements > 0 && !originError
        : actual.browserButton && !actual.embedded);
    console.log("NURU_GOOGLE_SMOKE " + JSON.stringify({
      test: testCase, actual, errors: errors.slice(0, 5), passed: good,
    }));
    if (originError && official) console.log("ACTION_REQUIRED: Add https://app.nurufaith.co.ke to Google Cloud Authorized JavaScript origins.");
    if (!good) failures++;
  } catch (e) {
    failures++;
    console.log("NURU_GOOGLE_SMOKE_FAIL " + JSON.stringify({
      test: testCase, error: String(e.message).slice(0, 280), errors: errors.slice(0, 5),
      finalUrl: page.url(),
    }));
  } finally {
    await context.close();
  }
}
await browser.close();
console.log("NURU_GOOGLE_SMOKE_FAILURES=" + failures);
if (failures) process.exitCode = 1;
