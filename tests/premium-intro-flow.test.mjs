import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  completeIntro,
  firstEntryDestination,
  introWasCompleted,
  INTRO_STORAGE_KEY,
} from "../src/lib/introFlow.ts";

const read = (file) => readFileSync(file, "utf8");
function fakeStorage() {
  const entries = new Map();
  return {
    entries,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
}

test("first launch sees welcome; returning signed-out visitors see sign-in", () => {
  assert.equal(firstEntryDestination(false, false), "/welcome");
  assert.equal(firstEntryDestination(false, true), "/auth");
  assert.equal(firstEntryDestination(true, false), "/home");
  assert.equal(firstEntryDestination(true, true), "/home");
});

test("intro completion persists locally and is versioned independently from auth", () => {
  const store = fakeStorage();
  assert.equal(introWasCompleted(store), false);
  completeIntro(store);
  assert.equal(store.entries.get(INTRO_STORAGE_KEY), "1");
  assert.equal(introWasCompleted(store), true);
  assert.doesNotMatch(INTRO_STORAGE_KEY, /token|session|user_id/);
});

test("blocked local storage can never trap the visitor", () => {
  const blocked = {
    getItem() { throw new Error("Disabled storage"); },
    setItem() { throw new Error("Disabled storage"); },
  };
  assert.equal(introWasCompleted(blocked), false);
  assert.doesNotThrow(() => completeIntro(blocked));
  assert.equal(introWasCompleted(null), false);
  assert.doesNotThrow(() => completeIntro(null));
});

test("entry waits for splash then safely chooses a route with a session timeout", () => {
  const index = read("src/routes/index.tsx");
  assert.match(index, /<SplashScreen initialOnly onComplete=/);
  assert.match(index, /firstEntryDestination\(destination === "\/home", hasSeenIntro\)/);
  assert.match(index, /setDestination\(data\.session \? "\/home" : "\/welcome"\)/);
  assert.match(index, /window\.setTimeout\(/);
  assert.match(index, /window\.clearTimeout\(watchdog\)/);
  assert.match(index, /replace: true/);
  assert.doesNotMatch(read("src/routes/__root.tsx"), /<SplashScreen/);
});

test("welcome is an actual two-step app journey with persistent auth handoff", () => {
  const welcome = read("src/routes/welcome.tsx");
  assert.match(welcome, /useState<0 \| 1>\(0\)/);
  assert.match(welcome, /step === 0 \? setStep\(1\) : finish\("signup"\)/);
  assert.match(welcome, /completeIntro\(\)/);
  assert.match(welcome, /search: \{ mode \}/);
  assert.match(welcome, /finish\("login"\)/);
  assert.match(welcome, /src=\{step === 0 \? "\/photos\/friends-outdoors\.jpg" : "\/photos\/worship-gathering\.jpg"\}/);
  assert.match(welcome, /NuruGlyph/);
  assert.match(welcome, /aria-live="polite"/);
  assert.match(welcome, /Sign in/);
  assert.match(welcome, /data-testid="nuru-intro"/);
});

test("intro is safe on narrow phones and respects reduced motion", () => {
  const welcome = read("src/routes/welcome.tsx");
  const css = read("src/styles.css");
  for (const mobile of ["min-h-dvh","overflow-x-hidden","env(safe-area-inset-bottom)","env(safe-area-inset-top)","max-w-xl","min-h-12"]) {
    assert.ok(welcome.includes(mobile), mobile);
  }
  assert.match(css, /nuru-intro-content-in/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /nuru-opening-ring/);
});

test("deep links, OAuth and protected route guards remain outside the startup intro", () => {
  const route = read("src/routes/_authenticated/route.tsx");
  const root = read("src/routes/__root.tsx");
  assert.match(route, /rememberAfterLogin\(location\.href, window\.location\.origin\)/);
  assert.match(root, /LEGACY_CANONICAL_INIT_SCRIPT/);
  assert.match(route, /supabase\.auth\.getSession\(\)/);
  assert.match(route, /needsOnboarding && location\.pathname !== "\/onboarding"/);
});
