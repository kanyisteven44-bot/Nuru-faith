import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(file)=>readFileSync(new URL("../"+file,import.meta.url),"utf8");

test("embedded Google sign-in validates each ID token using a fresh hashed nonce",()=>{
  const source=read("src/components/nuru/GoogleEmbeddedSignIn.tsx");
  assert.match(source,/crypto\.getRandomValues\(new Uint8Array\(32\)\)/);
  assert.match(source,/crypto\.subtle\.digest\("SHA-256"/);
  assert.match(source,/nonce: hashedNonce/);
  assert.match(source,/token: response\.credential/);
  assert.match(source,/supabase\.auth\.signInWithIdToken/);
  assert.match(source,/nonce,\s*\}\)/);
  assert.match(source,/if \(!data\.session\)/);
  assert.match(source,/use_fedcm_for_button: true/);
  assert.match(source,/auto_select: false/);
  assert.match(source,/ux_mode: "popup"/);
});

test("installed Nuru apps use same-window Google sign-in; browser OAuth fallback remains",()=>{
  const auth=read("src/routes/auth.tsx");
  assert.match(auth,/VITE_GOOGLE_EMBEDDED_ENABLED/);
  assert.match(auth,/setUseEmbeddedGoogle\(shouldUseEmbeddedGoogleSignIn\(/);
  assert.match(auth,/setting: import\.meta\.env\["VITE_GOOGLE_EMBEDDED_ENABLED"\]/);
  assert.match(auth,/hostname: window\.location\.hostname/);
  assert.doesNotMatch(auth,/isLegacyNuruHost/);
  assert.match(auth,/<GoogleEmbeddedSignIn/);
  assert.match(auth,/onSuccess=\{\(\) => void continueAfterSignIn\("\/home"\)\}/);
  assert.match(auth,/Use browser sign-in/);
  assert.match(auth,/supabase\.auth\.signInWithOAuth/);
  assert.match(auth,/window\.location\.assign\(data\.url\)/);
  const gsi=read("src/components/nuru/GoogleEmbeddedSignIn.tsx");
  assert.match(gsi,/VITE_GOOGLE_CLIENT_ID/);
  assert.ok(!/client_id:\s*["']\d+-/.test(gsi),"Public OAuth client ID must come from environment");
});

test("CSP grants Google Identity Services narrowly without exposing sensitive API endpoints",()=>{
  const conf=JSON.parse(read("vercel.json"));
  const csp=conf.headers[0].headers.find(h=>h.key==="Content-Security-Policy").value;
  assert.match(csp,/script-src[^;]+https:\/\/accounts\.google\.com\/gsi\/client/);
  assert.match(csp,/style-src[^;]+https:\/\/accounts\.google\.com\/gsi\/style/);
  assert.match(csp,/frame-src[^;]+https:\/\/accounts\.google\.com/);
  assert.match(csp,/connect-src[^;]+https:\/\/accounts\.google\.com/);
  assert.match(csp,/frame-ancestors 'none'/);
  assert.match(csp,/object-src 'none'/);
  assert.match(csp,/default-src 'self'/);
});
