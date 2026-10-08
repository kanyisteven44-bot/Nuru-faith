import test from "node:test";
import assert from "node:assert/strict";
import { STICKERS, STICKER_PACKS, STICKER_BY_ID } from "../src/lib/chatReactions.ts";

test("Nuru ships a large searchable sticker library", () => {
  assert.ok(STICKERS.length >= 500, `expected at least 500 stickers, got ${STICKERS.length}`);
  assert.ok(STICKER_PACKS.length >= 20, `expected at least 20 packs, got ${STICKER_PACKS.length}`);
});

test("sticker ids stay unique and resolve back to their sticker", () => {
  const ids = STICKERS.map((sticker) => sticker.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const sticker of STICKERS) assert.equal(STICKER_BY_ID.get(sticker.id)?.label, sticker.label);
});

test("new everyday categories are available", () => {
  for (const pack of ["Morning", "Birthday", "Gratitude", "Church", "Music", "Work", "Travel", "Food", "Family", "Relationship"]) {
    assert.ok(STICKER_PACKS.includes(pack), `missing sticker pack: ${pack}`);
  }
});
