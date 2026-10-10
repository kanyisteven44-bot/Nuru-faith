import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("login, signup and password reset have initial HTML on slow devices", () => {
  const auth = read("src/routes/auth.tsx");
  assert.match(auth, /createFileRoute\("\/auth"\)\(\{\s*ssr: true/);
  assert.match(auth, /Reset your password/);
  assert.match(auth, /Create an account/);
  assert.match(auth, /Welcome back/);
  assert.match(auth, /<form onSubmit=\{submitEmail\}/);
  assert.match(auth, /supabase\.auth\.signInWithPassword/);
  assert.match(auth, /supabase\.auth\.signUp/);
  assert.match(auth, /supabase\.auth\.resetPasswordForEmail/);
});

test("home no longer downloads the unused Welcome landscape before first render", () => {
  const home = read("src/routes/index.tsx");
  const welcome = read("src/routes/welcome.tsx");
  assert.doesNotMatch(home, /alpine-reflections\.jpg/);
  assert.doesNotMatch(home, /WELCOME_IMAGE_SRCSET/);
  assert.match(home, /canonical.*PUBLIC_SITE/);
  assert.match(welcome, /imageSrcSet: WELCOME_IMAGE_SRCSET/);
  assert.match(welcome, /imageSizes: WELCOME_IMAGE_SIZES/);
  assert.match(welcome, /fetchPriority: "high"/);
});

test("public legal documents have stable canonical URLs", () => {
  assert.match(read("src/routes/privacy.tsx"), /rel: "canonical", href: "https:\/\/app\.nurufaith\.co\.ke\/privacy"/);
  assert.match(read("src/routes/terms.tsx"), /rel: "canonical", href: "https:\/\/app\.nurufaith\.co\.ke\/terms"/);
  const secure = read("src/routes/_authenticated/route.tsx");
  assert.match(secure, /"noindex, nofollow"/);
});

test("live mobile browser audit waits for actual usable forms on cold loads", () => {
  const testScript = read("scripts/audit-live-mobile.mjs");
  assert.match(testScript, /route\.startsWith\("\/auth\?"\)/);
  assert.match(testScript, /tab\.locator\("form"\)\.first\(\)\.waitFor/);
  assert.match(testScript, /timeout: 12000/);
  assert.match(testScript, /problems\.push\("empty_page"\)/);
});
