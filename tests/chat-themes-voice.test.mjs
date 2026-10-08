import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { CHAT_THEMES, findChatTheme, chatThemeStorageKey } from "../src/lib/chatThemes.ts";
import { voiceSeconds, voiceTime } from "../src/lib/voicePlayback.ts";

test("100 named backgrounds have unique ids and distinct designs", () => {
  assert.equal(CHAT_THEMES.length, 100);
  assert.equal(new Set(CHAT_THEMES.map((t) => t.id)).size, 100);
  assert.equal(new Set(CHAT_THEMES.map((t) => t.background)).size, 100);
  assert.equal(CHAT_THEMES.filter((t) => t.category === "Photos").length, 9);
});
test("photographic backgrounds use existing bundled assets", () => {
  for (const t of CHAT_THEMES.filter((t) => t.category === "Photos")) {
    const path = t.background.match(/url\("(.*?)"\)/)[1];
    assert.ok(existsSync(new URL(`../public${path}`, import.meta.url)));
  }
});
test("unknown themes safely reset and preferences are isolated by user and chat", () => {
  assert.equal(findChatTheme("invalid").id, "classic");
  assert.equal(findChatTheme("rose-3").id, "rose-3");
  assert.notEqual(chatThemeStorageKey("a", "direct:x"), chatThemeStorageKey("b", "direct:x"));
  assert.notEqual(chatThemeStorageKey("a", "direct:x"), chatThemeStorageKey("a", "group:x"));
});
test("voice time handles unknown, infinite WebM duration and recorded fallback", () => {
  for (const v of [Infinity, NaN, -1, null, undefined]) assert.equal(voiceSeconds(v), 0);
  assert.equal(voiceSeconds(Infinity) || voiceSeconds(7000 / 1000), 7);
  assert.equal(voiceTime(7), "0:07");
  assert.equal(voiceTime(65.9), "1:05");
  assert.equal(voiceTime(NaN), "0:00");
});
