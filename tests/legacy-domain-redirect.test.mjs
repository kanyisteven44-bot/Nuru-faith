import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

test("legacy installed PWAs retain same-origin resources and routes", () => {
  // Do not redirect the entire old host at the CDN: an installed
  // nurufaith.website PWA depends on its own manifest, service worker,
  // cache and auth storage. Cross-origin 307 redirects broke those installs.
  const redirects = config.redirects ?? [];
  for (const host of ["nurufaith.website", "www.nurufaith.website"]) {
    assert.ok(!redirects.some((redirect) =>
      redirect.has?.some((rule) => rule.type === "host" && rule.value === host)
    ), `Unexpected blanket redirect for installed PWA origin: ${host}`);
  }
});
