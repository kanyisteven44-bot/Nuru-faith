import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const apex = "nurufaith.co.ke";
const ministry = "nuru-faith-ministry.vercel.app";

test("apex serves the Nuru Faith youth app without rewriting to ministry", () => {
  assert.ok(!(config.rewrites ?? []).some((rule) =>
    rule.destination?.includes(ministry) ||
    rule.has?.some((h) => h.type === "host" && h.value === apex)
  ));
});

test("Nuru Faith apex auth and share links stay within the youth app", () => {
  assert.ok(!(config.redirects ?? []).some((rule) =>
    rule.has?.some((h) => h.type === "host" && h.value === apex)
  ));
});

test("no catch-all rewrite or redirect sends app users to the ministry", () => {
  for (const rule of [...(config.redirects ?? []), ...(config.rewrites ?? [])]) {
    assert.ok(!rule.destination?.includes(ministry));
  }
});

test("Nitro Vercel build output never rewrites either youth app host to ministry", () => {
  const vite = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
  assert.doesNotMatch(vite, /dest:\s*["'`]https:\/\/nuru-faith-ministry/);
  assert.doesNotMatch(vite, /domainRoutes\s*=/);
});

test("both youth app hostnames remain protected from cross-project rewrites", () => {
  const vite = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
  for (const host of ["nurufaith.co.ke", "app.nurufaith.co.ke"]) {
    const rules = [...(config.rewrites ?? []), ...(config.redirects ?? [])];
    assert.ok(!rules.some((rule) =>
      rule.has?.some((condition) => condition.type === "host" && condition.value === host) &&
      /ministry/i.test(rule.destination ?? "")
    ), host + " must never route to ministry");
  }
  assert.doesNotMatch(vite, /nuru-faith-ministry\.vercel\.app/);
  assert.doesNotMatch(vite, /domainRoutes\s*=/);
});
