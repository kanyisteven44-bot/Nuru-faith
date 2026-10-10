import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalBrowserDestination } from "../src/lib/pwaMode.ts";

const canonical = "https://app.nurufaith.co.ke";

test("deprecated web browser links move to the official Nuru domain with route/query/hash preserved", () => {
  assert.equal(canonicalBrowserDestination("https://nurufaith.website/", false), canonical + "/");
  assert.equal(
    canonicalBrowserDestination("https://nurufaith.website/admin?section=dashboard", false),
    canonical + "/admin?section=dashboard",
  );
  assert.equal(
    canonicalBrowserDestination("https://www.nurufaith.website/reels?reel=123#comments", false),
    canonical + "/reels?reel=123#comments",
  );
  assert.equal(
    canonicalBrowserDestination("https://nurufaith.website/bible?reference=John%203%3A16", false),
    canonical + "/bible?reference=John%203%3A16",
  );
});

test("old installed PWAs never navigate across origins while opened from their icons", () => {
  assert.equal(canonicalBrowserDestination("https://nurufaith.website/home", true), null);
  assert.equal(canonicalBrowserDestination("https://nurufaith.website/ai", true), null);
  assert.equal(canonicalBrowserDestination("https://nurufaith.website/admin?section=dashboard", true), null);
});

test("auth callbacks and password reset links never leave their original origin", () => {
  for (const path of [
    "/auth-callback?code=abc123",
    "/reset-password?type=recovery",
    "/confirm?token_hash=abc",
    "/auth/confirm?code=secret",
    "/?code=secret",
    "/home#access_token=secret&refresh_token=secret",
  ]) {
    assert.equal(canonicalBrowserDestination("https://nurufaith.website" + path, false), null, path);
  }
});

test("official and other hosts never redirect", () => {
  assert.equal(canonicalBrowserDestination("https://app.nurufaith.co.ke/", false), null);
  assert.equal(canonicalBrowserDestination("https://example.com/admin", false), null);
  assert.equal(canonicalBrowserDestination("not valid url", false), null);
  assert.equal(canonicalBrowserDestination("javascript:alert(1)", false), null);
});

test("legacy browser migration does not introduce a blanket CDN redirect", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.ok(!(config.redirects ?? []).some((rule) => rule.has?.some((item) =>
    item.type === "host" && item.value === "nurufaith.website"
  )));
  const root = readFileSync(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
  assert.match(root, /canonicalBrowserDestination\(/
  );
  assert.match(root, /window\.location\.replace\(destination\)/);
  assert.match(root, /isInstalledApp\(\) \|\| finishingOldAuth/);
  assert.match(root, /nuru-legacy-auth-in-progress/);
  assert.match(root, /isLegacyNuruHost\(window\.location\.hostname\) && !isInstalledApp\(\)/);
});
