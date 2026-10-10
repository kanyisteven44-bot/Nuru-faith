import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public routes do not eagerly import authenticated real-time listeners", () => {
  const route = read("src/routes/_authenticated/route.tsx");
  const shell = read("src/components/nuru/AuthenticatedLayout.tsx");
  assert.match(route, /lazyRouteComponent\(/);
  assert.match(route, /import\("@\/components\/nuru\/AuthenticatedLayout"\)/);
  assert.doesNotMatch(route, /import \{ (?:CallManager|MessageAlerts) \}/);
  assert.match(shell, /<CallManager>/);
  assert.match(shell, /<MessageAlerts \/>/);
  assert.match(shell, /<Outlet \/>/);
  assert.match(route, /beforeLoad: async/);
  assert.match(route, /rememberAfterLogin/);
});

test("opening shares the entry route's resolved session without a second subscription", () => {
  const index = read("src/routes/index.tsx");
  const splash = read("src/components/nuru/SplashScreen.tsx");
  assert.match(index, /supabase\.auth\.getSession\(\)/);
  assert.match(index, /authReady=\{destination !== null\}/);
  assert.match(splash, /const loadingRef = useRef\(!authReady\)/);
  assert.match(splash, /minElapsed\.current && authReady/);
  assert.doesNotMatch(splash, /useAuth\(/);
  assert.match(splash, /const MAX_MS = 1800/);
  assert.match(splash, /if \(preview \|\| stage === "gone"\) return/);
});
