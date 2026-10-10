import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isFormerApexHost, loginCallbackOrigin, shouldUseEmbeddedGoogleSignIn, canonicalBrowserDestination } from "../src/lib/pwaMode.ts";
import { OFFICIAL_NURU_ORIGIN, canonicalShareUrl } from "../src/lib/publicLinks.ts";

const read = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");

test("official youth app origin is the app subdomain", () => {
  assert.equal(OFFICIAL_NURU_ORIGIN, "https://app.nurufaith.co.ke");
  assert.equal(isFormerApexHost("nurufaith.co.ke"), true);
  assert.equal(isFormerApexHost("app.nurufaith.co.ke"), false);
});

test("installed PWAs on the former apex finish sign-in on their own origin", () => {
  assert.equal(loginCallbackOrigin("https://nurufaith.co.ke", "nurufaith.co.ke", true), "https://nurufaith.co.ke");
  assert.equal(loginCallbackOrigin("https://nurufaith.co.ke", "nurufaith.co.ke", false), "https://app.nurufaith.co.ke");
  const ok = { installed: true, clientId: "abc-123.apps.googleusercontent.com" };
  assert.equal(shouldUseEmbeddedGoogleSignIn({ ...ok, hostname: "app.nurufaith.co.ke" }), true);
  assert.equal(shouldUseEmbeddedGoogleSignIn({ ...ok, hostname: "nurufaith.co.ke" }), true);
});

test("the former apex is never force-redirected (it becomes the ministry site)", () => {
  assert.equal(canonicalBrowserDestination("https://nurufaith.co.ke/home", false), null);
  const vercel = JSON.parse(read("vercel.json"));
  assert.ok(!(vercel.redirects ?? []).some((r) => r.has?.some((c) => c.type === "host" && /nurufaith\.co\.ke$/.test(c.value))));
});

test("old apex share links move to the app subdomain", () => {
  assert.equal(canonicalShareUrl("https://nurufaith.co.ke/reels?reel=1"), "https://app.nurufaith.co.ke/reels?reel=1");
  assert.equal(canonicalShareUrl("https://www.nurufaith.co.ke/ai"), "https://app.nurufaith.co.ke/ai");
});

test("account deletion accepts the app subdomain and transitional origins", () => {
  const fn = read("supabase/functions/delete-account/index.ts");
  for (const o of ["https://app.nurufaith.co.ke", "https://nurufaith.co.ke", "https://nurufaith.website"]) assert.ok(fn.includes(`"${o}"`), o);
});
