import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("legacy Nuru installations receive a manual migration prompt without forced redirects", () => {
  const notice = read("src/components/nuru/LegacyDomainNotice.tsx");
  const root = read("src/routes/__root.tsx");
  assert.match(notice, /nurufaith\.website/);
  assert.match(notice, /www\.nurufaith\.website/);
  assert.match(notice, /window\.location\.hostname/);
  assert.match(notice, /https:\/\/nurufaith\.co\.ke/);
  assert.match(notice, /onClick=\{dismiss\}/);
  assert.match(notice, /href=\{destination\}/);
  assert.match(notice, /installed \? \(/);
  assert.match(notice, /navigator\.clipboard\.writeText\(destination\)/);
  assert.match(notice, /downloaded\/offline data may not transfer automatically/);
  assert.ok(!/window\.location\.(replace|assign)\(/.test(notice));
  assert.match(root, /<LegacyDomainNotice\s*\/>/);
});

test("admin migration destination preserves the correct official dashboard route", () => {
  const notice = read("src/components/nuru/LegacyDomainNotice.tsx");
  assert.match(notice, /pathname === "\/admin"/);
  assert.match(notice, /\/admin\?section=dashboard/);
  assert.match(notice, /\/welcome/);
});

test("old PWA service worker and manifest remain on the old origin while people migrate", () => {
  const vercel = JSON.parse(read("vercel.json"));
  assert.ok(!(vercel.redirects ?? []).some((redirect) =>
    redirect.has?.some((condition) =>
      condition.type === "host" && ["nurufaith.website", "www.nurufaith.website"].includes(condition.value)
    )
  ), "host-wide redirects break already-installed PWAs");
  const root = read("src/routes/__root.tsx");
  assert.match(root, /serviceWorker\.register\("\/sw\.js"\)/);
  assert.match(root, /href: "\/manifest\.webmanifest"/);
});
