import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage"] });
const sites = [
  "https://nurufaith.co.ke",
  "https://nurufaith.website",
];
let failures = 0;
for (const origin of sites) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true, isMobile: true,
  });
  const tab = await context.newPage();
  await tab.addInitScript(() => {
    // Simulate the standalone Android display-mode value without creating
    // real user accounts or using actual Chrome install permissions.
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      if (query === "(display-mode: standalone)") {
        return {
          matches: true, media: query,
          addListener() {}, removeListener() {},
          addEventListener() {}, removeEventListener() {},
          dispatchEvent() { return true; },
          onchange: null,
        };
      }
      return original(query);
    };
  });
  const errors = [];
  tab.on("console", m => {
    if (m.type() === "error") {
      const message = m.text();
      if (/google|origin|credential|fedcm|gsi|content security/i.test(message))
        errors.push(message.slice(0, 220));
    }
  });
  tab.on("pageerror", e => errors.push(e.message.slice(0, 220)));
  try {
    await tab.goto(origin + "/auth?mode=login", { waitUntil: "domcontentloaded", timeout: 45000 });
    await tab.locator('[aria-label="Continue with Google inside Nuru Faith"]').waitFor({ timeout: 20000 });
    await tab.waitForTimeout(6500);
    const result = await tab.evaluate(() => {
      const container = document.querySelector('[aria-label="Continue with Google inside Nuru Faith"]');
      return {
        hostname: location.hostname,
        embeddedContainer: Boolean(container),
        fallback: document.body.innerText.includes("Use browser sign-in instead"),
        frameCount: container?.querySelectorAll("iframe").length || 0,
        renderedHtmlLength: container?.innerHTML.length || 0,
        visible: Boolean(container && container.getBoundingClientRect().width > 100),
        nonempty: Boolean(container?.childElementCount),
      };
    });
    console.log("INSTALLED_GOOGLE_UI "+JSON.stringify(result));
    console.log("GOOGLE_JS_ERRORS "+JSON.stringify(errors.slice(0, 6)));
    if (!result.embeddedContainer || !result.fallback || !result.visible) failures++;
    // Chrome/Google can block GIS framing by account or origin policy; make
    // failures visible rather than silently claiming Google login works.
    if (errors.some(e => /origin is not allowed for the given client id/i.test(e))) {
      console.log("REQUIRES_GOOGLE_CLOUD_AUTHORIZED_JAVASCRIPT_ORIGIN "+origin);
      failures++;
    }
    if (!result.nonempty) {
      console.log("NO_RENDERED_GOOGLE_BUTTON "+origin);
      failures++;
    }
  } catch(e) {
    failures++;
    console.log("GOOGLE_UI_FAIL "+origin+" "+String(e.message).slice(0, 240));
  } finally {
    await context.close();
  }
}
await browser.close();
console.log("INSTALLED_GOOGLE_UI_FAILURES="+failures);
if(failures) process.exitCode=1;
