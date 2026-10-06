import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const callPanel = readFileSync("src/components/nuru/CallPanel.tsx", "utf8");
const authMiddleware = readFileSync("src/integrations/supabase/auth-middleware.ts", "utf8");

test("call setup relies on global auth middleware instead of overriding Authorization", () => {
  assert.match(callPanel, /iceServers = await getCallIceServers\(\)/);
  assert.doesNotMatch(
    callPanel,
    /getCallIceServers\(\{[\s\S]{0,120}Authorization:/,
  );
});

test("call setup refreshes a stale Supabase session once before failing", () => {
  assert.match(callPanel, /message\.includes\("Unauthorized"\)/);
  assert.match(callPanel, /supabase\.auth\.refreshSession\(\)/);
  assert.match(
    callPanel,
    /Your sign-in session expired\. Sign in again, then retry the call\./,
  );
});

test("server auth validates user access tokens with Supabase rather than JWT string shape", () => {
  assert.doesNotMatch(authMiddleware, /token\.split\("\\."\)/);
  assert.match(authMiddleware, /isNewSupabaseApiKey\(token\)/);
  assert.match(authMiddleware, /supabase\.auth\.getClaims\(token\)/);
});
