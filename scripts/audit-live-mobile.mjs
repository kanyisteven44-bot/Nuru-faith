/** Live Nuru Faith browser QA: actual Chromium on several phone/desktop sizes.
 * Selected public routes are checked for rendering and layout, not every feature.
 * Protected routes are tested READ-ONLY only
 * if a dedicated QA account is supplied via NURU_QA_EMAIL/PASSWORD.
 */
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = (process.env.NURU_QA_BASE || "https://nurufaith.co.ke").replace(/\/$/, "");
const OUT = "browser-qa";
const email = process.env.NURU_QA_EMAIL || "";
const password = process.env.NURU_QA_PASSWORD || "";
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage"] });
const errors = [], results = [], risks = [];
let failures = 0;
const pages = [
  ["/", "landing"], ["/welcome", "welcome"],
  ["/about", "about"], ["/auth?mode=login", "sign-in"],
  ["/auth?mode=signup", "sign-up"], ["/auth?mode=forgot", "reset-request"],
  ["/reset-password", "reset-page"], ["/privacy", "privacy"],
  ["/terms", "terms"], ["/bible-app-for-young-people", "bible-public"],
  ["/christian-community-app", "community-public"],
  ["/opening", "opening"], ["/christian-app", "christian-app"],
  ["/christian-app-kenya", "christian-app-kenya"],
  ["/gospel-music-app", "gospel-music-public"],
  ["/books", "books"], ["/faith-courses", "faith-courses"],
  ["/passage?book=John&chapter=3&verses=16&translation=web", "shared-passage"],
  ["/design-preview", "design-preview"],
];
const viewports = [
  { label: "mobile-320", width: 320, height: 720, mobile: true },
  { label: "mobile-360", width: 360, height: 800, mobile: true },
  { label: "mobile-412", width: 412, height: 915, mobile: true },
  { label: "mobile-390", width: 390, height: 844, mobile: true },
  { label: "mobile-430", width: 430, height: 932, mobile: true },
  { label: "desktop", width: 1366, height: 768, mobile: false },
];
for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.mobile, hasTouch: viewport.mobile,
    locale: "en-KE", timezoneId: "Africa/Nairobi",
    colorScheme: "dark",
  });
  const tab = await context.newPage();
  tab.on("pageerror", e => errors.push({ device: viewport.label, route: new URL(tab.url()).pathname, kind: "pageerror", text: String(e.message).slice(0, 240) }));
  tab.on("response", r => {
    if (r.status() >= 500 && r.url().startsWith(BASE))
      errors.push({ device: viewport.label, route: tab.url(), kind: "http5xx", status: r.status(), url: r.url().split("?")[0] });
  });
  for (const [route, label] of pages) {
    const url = BASE + route;
    const start = Date.now();
    try {
      // Capture LCP and long-task estimates without modifying real app code.
      await tab.addInitScript(() => {
        window.__nuruQa = { lcp: 0, cls: 0, longTask: 0 };
        try {
          new PerformanceObserver((list) => {
            for (const x of list.getEntries()) window.__nuruQa.lcp = Math.round(x.startTime);
          }).observe({ type: "largest-contentful-paint", buffered: true });
          new PerformanceObserver((list) => {
            for (const x of list.getEntries()) if (!x.hadRecentInput) window.__nuruQa.cls += x.value;
          }).observe({ type: "layout-shift", buffered: true });
          new PerformanceObserver((list) => {
            for (const x of list.getEntries()) window.__nuruQa.longTask += Math.max(0, Math.round(x.duration - 50));
          }).observe({ type: "longtask", buffered: true });
        } catch { /* unsupported performance observer category */ }
      });
      const response = await tab.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      const initialHtml = route.startsWith("/auth?") && response
        ? await response.text()
        : "";
      if (route.startsWith("/auth?")) {
        // Browser-first pages used to return an empty shell during hydration,
        // especially at 360px on the first cold context. The sign-in form is
        // now server-rendered, and we explicitly wait for its usable UI.
        // This still FAILS if the form never arrives; it doesn't hide errors.
        await tab.locator("form").first().waitFor({ state: "visible", timeout: 12000 });
      } else {
        await tab.waitForTimeout(1700);
      }
      if (route === "/opening") {
        const splash = tab.getByTestId("nuru-splash");
        await splash.waitFor({ state: "visible", timeout: 12000 });
        // The photo must actually decode and remain visible behind transitions.
        await tab.waitForFunction(() => {
          const photo = document.querySelector(".nuru-opening-photo-base");
          return photo?.complete && photo.naturalWidth > 0 &&
            Number(getComputedStyle(photo).opacity) > 0;
        }, undefined, { timeout: 12000 });
        const fits = await splash.getByRole("button", { name: "Continue", exact: true }).evaluate(button => {
          const rect = button.getBoundingClientRect();
          return rect.left >= 0 && rect.right <= innerWidth &&
            rect.top >= 0 && rect.bottom <= innerHeight;
        });
        if (!fits) throw Error("Opening Continue is outside the viewport");
      }
      const v = await tab.evaluate(() => {
        const root = document.documentElement;
        const visibleImages = Array.from(document.images).filter(img => {
          const rect = img.getBoundingClientRect();
          return rect.width > 2 && rect.height > 2 && rect.top < innerHeight && rect.bottom > 0;
        });
        return {
          title: document.title,
          url: location.href,
          text: document.body.innerText.trim().length,
          overflow: root.scrollWidth - innerWidth,
          brokenImages: visibleImages.filter(i => i.complete && i.naturalWidth === 0).map(i => i.src.split("/").pop()).slice(0, 5),
          main: !!document.querySelector("main"),
          appError: /this page didn't load|something went wrong on our end/i.test(document.body.innerText),
          perf: { ...window.__nuruQa },
          navigation: performance.getEntriesByType("navigation").map(n => ({
            ttfb: Math.round(n.responseStart - n.startTime),
            domContentLoaded: Math.round(n.domContentLoadedEventEnd - n.startTime),
          }))[0] || null,
        };
      });
      const result = { device: viewport.label, route, status: response?.status(), ms: Date.now() - start, ...v };
      results.push(result);
      const problems = [];
      if (response?.status() !== 200) problems.push("http_" + response?.status());
      if (v.text < 12) problems.push("empty_page");
      // A real form needs to be present in the *initial response*, not only
      // after JavaScript downloads. Blank SSR shells are poor launch UX.
      if (route.startsWith("/auth?") && !initialHtml.includes("<form"))
        problems.push("auth_not_server_rendered");
      if (v.appError) problems.push("app_error_page");
      if (v.overflow > 8) problems.push("horizontal_overflow_" + v.overflow + "px");
      if (v.brokenImages.length) problems.push("broken_images:" + v.brokenImages.join(","));
      if (problems.length) {
        failures++;
        console.log("FAIL", viewport.label, route, problems.join(" | "));
      } else {
        console.log("PASS", viewport.label, route, "LCP=" + v.perf?.lcp + "ms", "TTFB=" + v.navigation?.ttfb + "ms", "total=" + result.ms + "ms");
      }
      if (v.perf?.lcp > 3500) risks.push({ device: viewport.label, route, lcpMs: v.perf.lcp });
      if (viewport.label === "mobile-390") {
        await tab.screenshot({ path: path.join(OUT, label + ".png"), fullPage: true });
      }
      if (route === "/opening") {
        await tab.getByTestId("nuru-splash").getByRole("button", { name: "Continue", exact: true }).click();
        await tab.getByTestId("nuru-splash").waitFor({ state: "detached", timeout: 5000 });
        console.log("PASS opening photo, visible Continue and dismissal", viewport.label);
      }
    } catch(e) {
      failures++;
      errors.push({device: viewport.label, route, kind: "navigation", text: String(e.message).slice(0, 250)});
      console.log("FAIL", viewport.label, route, String(e.message).split("\n")[0]);
    }
  }
  if (viewport.label === "mobile-390") {
    // Actual UI click, not just HTTP route checks.
    try {
      await tab.goto(BASE + "/auth?mode=login", { waitUntil: "domcontentloaded", timeout: 45000 });
      await tab.getByRole("tab", { name: "Sign Up" }).click({ timeout: 10000 });
      if (!tab.url().includes("mode=signup")) throw Error("Sign Up tab didn't navigate");
      await tab.getByRole("tab", { name: "Sign In" }).click({ timeout: 10000 });
      if (!tab.url().includes("mode=login")) throw Error("Sign In tab didn't navigate");
      console.log("PASS auth tab interactions");
    } catch(e) {
      failures++;
      console.log("FAIL auth tab interactions", String(e.message).split("\n")[0]);
    }
    // Test that clicking a real legacy browser link reaches the canonical URL.
    try {
      await tab.goto("https://nurufaith.website/admin?section=dashboard", { waitUntil: "domcontentloaded", timeout: 45000 });
      await tab.waitForURL(u => u.hostname === "nurufaith.co.ke", { timeout: 15000 });
      // A logged-out visitor must be shown Nuru sign-in. The intended admin
      // page is restored AFTER login, not rendered without authentication.
      await tab.waitForFunction(() =>
        location.pathname === "/auth" &&
        sessionStorage.getItem("nuru-return-after-login") === "/admin?section=dashboard",
        { timeout: 15000 },
      );
      console.log("PASS old admin URL kept across canonical redirect and login gate");
    } catch(e) {
      failures++;
      console.log("FAIL old browser admin link canonical migration", String(e.message).split("\n")[0]);
    }
  }
  await context.close();
}
if (email && password) {
  // No screenshots or mutations of private data. Only dedicated QA accounts.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const tab = await context.newPage();
  try {
    await tab.goto(BASE + "/auth?mode=login", { waitUntil: "domcontentloaded" });
    await tab.locator('input[type="email"]').first().fill(email);
    await tab.locator('input[type="password"]').first().fill(password);
    await tab.getByRole("button", { name: /^Sign In$/ }).click();
    await tab.waitForURL(u => /\/(?:home|onboarding)/.test(u.pathname), { timeout: 30000 });
    console.log("PASS authenticated QA account login (no identity recorded)");
    for (const route of ["/home", "/reels", "/bible", "/music", "/ai", "/messages", "/profile", "/settings"]) {
      await tab.goto(BASE + route, { waitUntil: "domcontentloaded" });
      await tab.waitForTimeout(700);
      const status = await tab.evaluate(() => ({route: location.pathname, text: document.body.innerText.length}));
      if (status.route !== route || status.text < 10) { failures++; console.log("FAIL authenticated route", route); }
      else console.log("PASS authenticated route", route);
    }
  } catch(e) {
    failures++;
    console.log("FAIL protected QA login", String(e.message).split("\n")[0]);
  } finally { await context.close(); }
} else {
  console.log("SKIP PROTECTED: no dedicated NURU_QA_EMAIL and NURU_QA_PASSWORD configured");
}
await browser.close();
await fs.writeFile(path.join(OUT, "results.json"), JSON.stringify({ results, errors, risks, failures, protectedTested: Boolean(email && password) }, null, 2));
console.log("SUMMARY " + JSON.stringify({ checked: results.length, failures, pageErrors: errors.length, slowLcpCases: risks.length, authenticated: Boolean(email && password) }));
if (failures) process.exitCode = 1;
