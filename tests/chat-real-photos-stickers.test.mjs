import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHAT_THEMES, realPhotoTheme, findChatTheme } from "../src/lib/chatThemes.ts";
import { STICKERS, STICKER_PACKS, STICKER_BY_ID } from "../src/lib/chatReactions.ts";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("real-photography theme IDs survive chat reload and reject untrusted paths", () => {
  const t = realPhotoTheme("237", "Photographer", "https://unsplash.com/photos/abcd");
  assert.equal(t.id, "real-photo-237");
  assert.equal(t.category, "Photos");
  assert.match(t.background, /https:\/\/picsum\.photos\/id\/237\/640\/960\.webp/);
  assert.equal(t.photoCredit, "Photographer");
  assert.equal(t.photoSource, "https://unsplash.com/photos/abcd");
  assert.equal(findChatTheme(t.id).id, t.id);
  for (const id of ["real-photo-../../admin", "real-photo-https://evil.test", "real-photo-not-a-number", "real-photo-999999999999"]) {
    assert.equal(findChatTheme(id).id, "classic", id);
  }
  assert.equal(new Set(CHAT_THEMES.map((v) => v.id)).size, CHAT_THEMES.length);
});

test("real photo library fetches validated author-credited records, not AI pictures", () => {
  const fn = read("src/lib/chatPhotos.functions.ts");
  assert.match(fn, /const TOTAL = 250/);
  assert.match(fn, /const PAGE_SIZE = 30/);
  assert.match(fn, /const PAGES = 9/);
  assert.match(fn, /picsum\.photos\/v2\/list\?page=/);
  assert.match(fn, /url\.hostname === "unsplash\.com"/);
  assert.match(fn, /unique\.set\(photo\.id/);
  assert.match(fn, /sourceUrl: photo\.url/);
  assert.match(fn, /requireSupabaseAuth/);
  assert.match(fn, /slice\(0, TOTAL\)/);
});

test("picker offers first 50 real themes and another 200 gallery photos", () => {
  const picker = read("src/components/nuru/ChatThemePicker.tsx");
  assert.match(picker, /realPhotos\.data \?\? \[\]\)\.slice\(0, 50\)/);
  assert.match(picker, /realPhotos\.data \?\? \[\]\)\.slice\(50, 250\)/);
  assert.match(picker, /"Photo library"/);
  assert.match(picker, /More photos/);
  assert.match(picker, /loading="lazy"/);
  assert.match(picker, /visibleOptions = options\.slice\(0, visibleCount\)/);
  assert.match(picker, /Show more backgrounds/);
  assert.match(picker, /Photo by \{preview\.photoCredit/);
  assert.match(picker, /onChange\(\s*draft,/);
});

test("120 new expressive stickers fit existing real message IDs", () => {
  for (const pack of ["Meme Energy", "Kenyan Banter", "Bestie Chats", "Big Feelings", "Plans & Hangouts", "Little Joys"]) {
    assert.ok(STICKER_PACKS.includes(pack), pack);
    assert.equal(STICKERS.filter(s => s.pack === pack).length, 20, pack);
  }
  const ids = STICKERS.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of STICKERS) assert.equal(STICKER_BY_ID.get(s.id)?.label, s.label);
  assert.ok(STICKERS.length >= 620, "must retain old stickers and add 120 more");
});
