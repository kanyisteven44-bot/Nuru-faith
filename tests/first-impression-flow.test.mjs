import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("new visitors see the welcome experience before authentication", () => {
  const index = read("src/routes/index.tsx");
  const welcome = read("src/routes/welcome.tsx");

  assert.match(index, /data\.session \? "\/home" : "\/welcome"/);
  assert.match(index, /setTimeout\(\(\) => go\("\/welcome"\)/);
  assert.match(welcome, />\s*Continue\s*</);
  assert.match(welcome, /search=\{\{ mode: "login" \}\}/);
  assert.match(welcome, /Sign in/);
  assert.doesNotMatch(welcome, /Create my account/);
  assert.doesNotMatch(welcome, /I already have an account/);
  assert.doesNotMatch(welcome, /\[0, 1, 2\]/);
});

test("all protected routes keep incomplete profiles inside onboarding", () => {
  const route = read("src/routes/_authenticated/route.tsx");

  assert.match(route, /select\("onboarded"\)/);
  assert.match(route, /needsOnboarding && location\.pathname !== "\/onboarding"/);
  assert.match(route, /throw redirect\(\{ to: "\/onboarding" \}\)/);
  assert.match(route, /!needsOnboarding && location\.pathname === "\/onboarding"/);
});

test("onboarding only completes after profile interests and membership writes succeed", () => {
  const onboarding = read("src/routes/_authenticated/onboarding.tsx");
  const finish = onboarding.slice(onboarding.indexOf("async function finish()"));

  const initialProfile = finish.indexOf("onboarded: false");
  const savePreferences = finish.indexOf("await saveOnboardingInterests");
  const churchMembership = finish.indexOf("await joinChurch");
  const completedProfile = finish.indexOf("updateProfile(userId, { onboarded: true })");

  assert.ok(initialProfile > 0);
  assert.ok(savePreferences > initialProfile);
  assert.ok(churchMembership > savePreferences);
  assert.ok(completedProfile > churchMembership);
  assert.match(onboarding, /checkUsernameAvailability/);
  assert.match(onboarding, /enabled: step === 3/);
});

test("journey stage metadata never leaks into normal interest personalization", () => {
  const service = read("src/services/content.ts");

  assert.match(service, /const JOURNEY_PREFIX = "__journey:"/);
  assert.match(service, /filter\(\(interest\) => !interest\.startsWith\(JOURNEY_PREFIX\)\)/);
  assert.match(service, /saveOnboardingInterests/);
});

test("home quick access avoids duplicate navigation and uses responsive tappable tiles", () => {
  const home = read("src/routes/_authenticated/home.tsx");
  const nav = read("src/components/nuru/nav.ts");
  assert.match(nav, /to: "\/bible", label: "Bible"/);
  assert.doesNotMatch(home, /to: "\/bible", label: "Bible"/);
  assert.match(home, /QUICK_ACCESS\.map/);
  assert.match(home, /grid grid-cols-2 gap-2\.5/);
  assert.match(home, /focus-visible:ring-2/);
  assert.match(home, /active:scale-\[0\.98\]/);
});
