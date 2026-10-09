import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { directChatFilter } from "../src/lib/chatPagination.ts";

const me = "11111111-1111-4111-8111-111111111111";
const friend = "22222222-2222-4222-8222-222222222222";
const third = "33333333-3333-4333-8333-333333333333";
const cursor = {
  created_at: "2026-10-09T12:25:02.100+00:00",
  id: "44444444-4444-4444-8444-444444444444",
};

test("initial direct thread filters both directions for exactly one peer", () => {
  const filter = directChatFilter(me, friend);
  assert.equal(
    filter,
    `or(and(sender_id.eq.${me},recipient_id.eq.${friend}),and(sender_id.eq.${friend},recipient_id.eq.${me}))`,
  );
  assert.doesNotMatch(filter, new RegExp(third));
});

test("older messages keep both peer filter and stable date/id cursor", () => {
  const filter = directChatFilter(me, friend, cursor);
  const peerPredicate = `or(and(sender_id.eq.${me},recipient_id.eq.${friend}),and(sender_id.eq.${friend},recipient_id.eq.${me}))`;
  const cursorPredicate = `or(created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id}))`;
  assert.equal(filter, `and(${peerPredicate},${cursorPredicate})`);
  assert.doesNotMatch(filter, new RegExp(third));
});

test("rejects invalid chat identifiers and cursor fields before building filters", () => {
  assert.throws(() => directChatFilter(me, "other-user"), /Invalid chat participant/);
  assert.throws(() => directChatFilter(me, friend, { ...cursor, id: "not-a-uuid" }), /Invalid message cursor/);
  assert.throws(() => directChatFilter(me, friend, { ...cursor, created_at: "2026-10-09,or(sender_id.not.is.null)" }), /Invalid message cursor/);
});

test("direct-message read applies the combined filter once rather than overwriting it", () => {
  const messaging = readFileSync("src/services/messaging.ts", "utf8");
  const directBlock = messaging.split('if ("user" in target) {')[1]?.split('let q = supabase')[0] ?? "";
  assert.match(directBlock, /\.or\(directChatFilter\(target\.self, target\.user, before\)\)/);
  assert.doesNotMatch(directBlock, /q\s*=\s*q\.or/);
});
