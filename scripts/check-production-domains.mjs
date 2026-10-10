#!/usr/bin/env node
/**
 * Safe external smoke check for the two Nuru Faith hosts.
 * Checks availability/indexing/security headers, NOT private account behavior.
 * No credentials and no mutation of user data.
 */
const canonical = "https://app.nurufaith.co.ke";
const legacy = "https://nurufaith.website";

const targets = [
  { url: canonical + "/", type: "homepage" },
  { url: canonical + "/about", type: "about" },
  { url: canonical + "/auth", type: "private" },
  { url: canonical + "/admin?section=dashboard", type: "private" },
  { url: canonical + "/sitemap.xml", type: "sitemap" },
  { url: legacy + "/", type: "legacy-home" },
  { url: legacy + "/ai", type: "legacy-page" },
  { url: legacy + "/admin?section=dashboard", type: "legacy-page" },
  { url: legacy + "/manifest.webmanifest", type: "manifest" },
  { url: legacy + "/sw.js", type: "worker" },
];

const errors = [];
function check(condition, message) {
  if (!condition) errors.push(message);
}

async function retrieve(url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
        headers: { "User-Agent": "NuruFaith-ProductionSmoke/1.0" },
      });
      const body = await response.text();
      // Retry transient failures only, never quietly accept a redirect.
      if (response.status >= 500 && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
        continue;
      }
      return { response, body };
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    }
  }
  throw lastError ?? new Error("Failed to fetch " + url);
}

for (const { url, type } of targets) {
  try {
    const { response, body } = await retrieve(url);
    check(response.status === 200, `${url}: expected HTTP 200, got ${response.status}`);
    check(!response.headers.has("location"), `${url}: unexpected redirect`);
    if (["homepage", "about", "private", "legacy-home", "legacy-page"].includes(type)) {
      check(response.headers.get("content-type")?.includes("text/html"), `${url}: not HTML`);
      check(!!response.headers.get("content-security-policy"), `${url}: CSP header missing`);
      check(!!response.headers.get("strict-transport-security"), `${url}: HTTPS HSTS header missing`);
    }
    if (type === "homepage" || type === "legacy-home") {
      check(body.includes('rel="canonical" href="https://app.nurufaith.co.ke/"'), `${url}: incorrect canonical`);
      check(!/<meta[^>]+name="robots"[^>]+content="noindex/i.test(body), `${url}: homepage not indexable`);
    }
    if (type === "about") {
      check(body.includes('rel="canonical" href="https://app.nurufaith.co.ke/about"'), `${url}: incorrect about canonical`);
    }
    if (type === "private") {
      check(/<meta[^>]+name="robots"[^>]+content="noindex, nofollow"/i.test(body), `${url}: private page is indexable`);
    }
    if (type === "sitemap") {
      check(body.includes("<loc>https://app.nurufaith.co.ke/</loc>"), `${url}: homepage missing from sitemap`);
      check(body.includes("<loc>https://app.nurufaith.co.ke/about</loc>"), `${url}: about missing from sitemap`);
    }
    if (type === "manifest") {
      const manifest = JSON.parse(body);
      check(manifest.display === "standalone", `${url}: installed PWA not standalone`);
      check(manifest.start_url === "/", `${url}: old PWA start URL changed`);
    }
    if (type === "worker") check(body.includes('self.addEventListener("install"'), `${url}: service worker unavailable`);
    console.log(`${response.status} ${url}`);
  } catch (error) {
    errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (errors.length) {
  console.error("\nNuru production smoke FAILED:");
  for (const error of errors) console.error(" - " + error);
  process.exitCode = 1;
} else {
  console.log("\nNuru public production smoke passed. Authenticated phone features need device testing.");
}
