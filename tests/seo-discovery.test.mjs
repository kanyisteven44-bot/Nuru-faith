import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const domain = "https://nurufaith.co.ke";

test("sitemap lists only canonical public .co.ke URLs", () => {
  const sitemap = read("public/sitemap.xml");
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  assert.ok(urls.length >= 10);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.includes(`${domain}/about`));
  assert.ok(urls.includes(`${domain}/`), "public homepage must be in sitemap");
  for (const url of urls) assert.ok(url.startsWith(`${domain}/`), url);
});

test("robots references the canonical sitemap and permits search bots", () => {
  const robots = read("public/robots.txt");
  assert.match(robots, /User-agent: OAI-SearchBot/);
  assert.match(robots, /User-agent: \*/);
  assert.ok(robots.includes(`Sitemap: ${domain}/sitemap.xml`));
});

test("public SEO pages consistently declare the new canonical domain", () => {
  const paths = ["src/routes/about.tsx","src/routes/__root.tsx","src/components/nuru/PublicSeoLanding.tsx","src/routes/welcome.tsx","src/routes/index.tsx","src/routes/christian-app.tsx","src/routes/christian-app-kenya.tsx","src/routes/christian-community-app.tsx","src/routes/gospel-music-app.tsx","src/routes/bible-app-for-young-people.tsx","src/routes/books.index.tsx","src/routes/faith-courses.index.tsx"];
  for (const path of paths) {
    const source = read(path);
    assert.ok(!source.includes("nurufaith.website"), path);
    assert.ok(source.includes(domain), path);
  }
});

test("about page identifies the founder as publicly readable content and structured data", () => {
  const source = read("src/routes/about.tsx");
  assert.ok(source.includes('name: "Stephen Kanyi"'));
  assert.ok(source.includes('id="founder"'));
  assert.ok(source.includes("Stephen Kanyi — Building Nuru Faith at 18"));
  assert.ok(source.includes("at the age of 18"));
  assert.ok(source.includes('"@type": "Person"'));
});

test("public homepage contains visible SSR marketing content and permits indexing", () => {
  const homepage = read("src/routes/index.tsx");
  assert.ok(homepage.includes('name: "robots", content: "index, follow, max-image-preview:large"'));
  assert.ok(homepage.includes('const PUBLIC_SITE = "https://nurufaith.co.ke/"'));
  assert.ok(homepage.includes("PublicSeoLanding"));
  assert.ok(homepage.includes("Stephen Kanyi"));
  assert.ok(homepage.includes("Vortiqora Technologies"));
  assert.ok(!homepage.includes('content: "noindex, follow"'));
  assert.ok(!homepage.includes('href: "https://nurufaith.co.ke/about"'));
});

test("private routes are still excluded from search indexing", () => {
  const authenticated = read("src/routes/_authenticated/route.tsx");
  const auth = read("src/routes/auth.tsx");
  assert.ok(authenticated.includes('content: "noindex, nofollow"'));
  assert.ok(auth.includes('content: "noindex, nofollow"'));
});

test("installed Nuru PWA continues to open the familiar app flow", () => {
  const homepage = read("src/routes/index.tsx");
  assert.ok(homepage.includes('setDestination(data.session ? "/home" : "/welcome")'));
  assert.ok(homepage.includes('<SplashScreen initialOnly'));
  assert.ok(homepage.includes('introComplete && destination'));
});
