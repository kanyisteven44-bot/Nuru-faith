import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sw = readFileSync("public/sw.js", "utf8");
const pushFn = readFileSync("supabase/functions/send-web-push/index.ts", "utf8");
const migration = readFileSync(
  "supabase/migrations/20261006101450_notify_incoming_calls_with_web_push.sql",
  "utf8",
);

test("incoming calls create critical push notifications with a direct call route", () => {
  assert.match(migration, /trg_notify_incoming_call/);
  assert.match(migration, /category, title, body, deep_link, priority/);
  assert.match(migration, /'call'/);
  assert.match(migration, /'critical'/);
  assert.match(migration, /'\/messages\?user=' \|\| new\.caller_id::text/);
});

test("web push payload keeps call category and expires call alerts quickly", () => {
  assert.match(pushFn, /category: notification\.category \|\| "system"/);
  assert.match(pushFn, /notification\.category === "call" \? 120/);
});

test("service worker keeps call alerts visible and opens the call when tapped", () => {
  assert.match(sw, /const isCall = category === "call"/);
  assert.match(sw, /requireInteraction: isCall \|\| priority === "critical"/);
  assert.match(sw, /action: "answer", title: "Open call"/);
  assert.match(sw, /event\.action === "dismiss"/);
  assert.match(sw, /client\.navigate\(target\)/);
});
