import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("profile soundtrack item foreign key has a standalone index", () => {
  const migration = read("supabase/migrations/20261009063000_index_profile_music_item_id.sql");
  assert.match(migration, /create index if not exists profile_music_item_id_idx/);
  assert.match(migration, /on public\.profile_music \(item_id\)/);
  assert.doesNotMatch(migration, /(?:drop|truncate|delete from|update public)\s/i);
});

test("launch mobile audit covers narrow phones, responsive phones, and desktop", () => {
  const script = read("scripts/audit-live-mobile.mjs");
  for (const n of [320, 360, 390, 412, 430, 1366])
    assert.match(script, new RegExp("width: " + n + ","));
  assert.match(script, /auth_not_server_rendered/);
  assert.match(script, /await response\.text\(\)/);
  assert.match(script, /const initialHtml/);
  assert.match(script, /no dedicated NURU_QA_EMAIL/);
});

test("launch gate documents concrete unfinished user journeys rather than claiming success", () => {
  const doc = read("LAUNCH_READINESS.md");
  for (const item of [
    "Leaked Password Protection Disabled",
    "Google OAuth",
    "background push",
    "Backups",
    "0 indexed of 12",
    "dedicated",
    "No field data confirmed",
  ]) assert.ok(doc.toLowerCase().includes(item.toLowerCase()), "missing " + item);
  assert.match(doc, /not a guarantee from Lighthouse/);
});
