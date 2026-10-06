import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const auth = readFileSync("src/routes/auth.tsx", "utf8");

test("auth redirects use the stable public app origin when configured", () => {
  assert.match(auth, /VITE_PUBLIC_APP_URL/);
  assert.match(auth, /publicAppOrigin\(\).*auth-callback/s);
  assert.match(auth, /publicAppOrigin\(\).*reset-password/s);
  assert.match(auth, /emailRedirectTo: publicAppOrigin\(\)/);
  assert.doesNotMatch(auth, /redirectTo: `\$\{window\.location\.origin\}\/auth-callback`/);
});
