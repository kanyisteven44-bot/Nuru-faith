import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shouldUseEmbeddedGoogleSignIn } from "../src/lib/pwaMode.ts";

const goodId = "1234567890-aBcD123xyz.apps.googleusercontent.com";
const available = {
  installed: true,
  hostname: "app.nurufaith.co.ke",
  clientId: goodId,
};

test("real installed official Nuru PWA uses Google in-app credentials by default", () => {
  assert.equal(shouldUseEmbeddedGoogleSignIn(available), true);
  assert.equal(shouldUseEmbeddedGoogleSignIn({ ...available, setting: "true" }), true);
});

test("ordinary browsers and old installed .website PWAs retain existing OAuth", () => {
  assert.equal(shouldUseEmbeddedGoogleSignIn({ ...available, installed: false }), false);
  assert.equal(shouldUseEmbeddedGoogleSignIn({ ...available, hostname: "nurufaith.website" }), false);
  assert.equal(shouldUseEmbeddedGoogleSignIn({ ...available, hostname: "www.nurufaith.website" }), false);
  assert.equal(shouldUseEmbeddedGoogleSignIn({ ...available, hostname: "malicious.example" }), false);
});

test("invalid or unset Google ID cannot activate unsupported in-app sign-in", () => {
  assert.equal(shouldUseEmbeddedGoogleSignIn({ ...available, clientId: undefined }), false);
  assert.equal(shouldUseEmbeddedGoogleSignIn({ ...available, clientId: "123456" }), false);
  assert.equal(shouldUseEmbeddedGoogleSignIn({ ...available, setting: "false" }), false);
});

test("Google secure nonce, existing browser fallback, and official domain remain intact", () => {
  const auth = readFileSync(new URL("../src/routes/auth.tsx", import.meta.url), "utf8");
  const sdk = readFileSync(new URL("../src/components/nuru/GoogleEmbeddedSignIn.tsx", import.meta.url), "utf8");
  assert.match(auth, /shouldUseEmbeddedGoogleSignIn/);
  assert.match(auth, /Google not working here\? Use browser sign-in/);
  assert.match(auth, /signInWithOAuth/);
  assert.match(sdk, /signInWithIdToken/);
  assert.match(sdk, /crypto\.getRandomValues/);
  assert.match(sdk, /nonce: hashedNonce/);
  assert.match(sdk, /use_fedcm_for_button: true/);
});
