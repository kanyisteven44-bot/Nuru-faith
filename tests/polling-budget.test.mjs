import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

// These components are mounted for every signed-in user, so their polls run
// once per open tab. Realtime does the instant work; polls are a fallback and
// must stay slow enough that thousands of tabs do not swamp the database.
test("always-mounted polls stay slow and pause in background tabs", () => {
  const calls = read("src/components/nuru/CallManager.tsx");
  assert.match(calls, /refetchInterval: activeCall \? false : 10_000/);
  assert.match(calls, /refetchIntervalInBackground: false/);
  assert.match(calls, /incoming-calls-/);

  const alerts = read("src/components/nuru/MessageAlerts.tsx");
  assert.match(alerts, /refetchInterval: 30_000/);
  assert.match(alerts, /refetchIntervalInBackground: false/);
  assert.match(alerts, /message-alerts-/);
});

test("no screen polls faster than every 5 seconds", () => {
  for (const path of [
    "src/components/nuru/CallManager.tsx",
    "src/components/nuru/MessageAlerts.tsx",
    "src/components/nuru/RichChatThread.tsx",
    "src/routes/_authenticated/messages.tsx",
    "src/routes/_authenticated/groups.tsx",
  ]) {
    for (const match of read(path).matchAll(/refetchInterval:[^,\n]*?(\d[\d_]*)\b/g)) {
      const ms = Number(match[1].replaceAll("_", ""));
      assert.ok(ms >= 5000, `${path} polls every ${ms}ms`);
    }
  }
});
