import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  bibleSpeechLocale,
  bibleMatchingVoices,
  bibleSpeechChunks,
} from "../src/lib/bibleSpeech.ts";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Bible text language maps into international device voice tags", () => {
  const examples = {
    English: "en-US", Swahili: "sw-KE", "Arabic, Standard": "ar-SA",
    Chinese: "zh-CN", French: "fr-FR", Portuguese: "pt-PT",
    Czech: "cs-CZ", Latin: "la", Romanian: "ro-RO", Cherokee: "chr-US",
    German: "de-DE", Hindi: "hi-IN", Japanese: "ja-JP",
    "Kikuyu": "ki-KE", "Dholuo": "luo-KE", "Amharic": "am-ET",
  };
  for (const [name, locale] of Object.entries(examples))
    assert.equal(bibleSpeechLocale(name), locale, name);
  assert.equal(bibleSpeechLocale("Unidentified endangered language"), null);
});

test("voice matching never auto-picks an English voice for non-English Bibles", () => {
  const voices = [
    { name: "English", lang: "en-US", voiceURI: "us" },
    { name: "Swahili (Kenya)", lang: "sw-KE", voiceURI: "sw" },
    { name: "Mandarin", lang: "zh-CN", voiceURI: "zh" },
    { name: "English British", lang: "en-GB", voiceURI: "uk" },
  ];
  assert.deepEqual(bibleMatchingVoices(voices, "Swahili").map(v => v.voiceURI), ["sw"]);
  assert.deepEqual(bibleMatchingVoices(voices, "Chinese").map(v => v.voiceURI), ["zh"]);
  assert.deepEqual(bibleMatchingVoices(voices, "Amharic"), []);
  assert.deepEqual(bibleMatchingVoices(voices, "English").map(v => v.voiceURI), ["us", "uk"]);
});

test("long verses and scripts without spaces become complete short playback chunks", () => {
  const long = "In the beginning " + "the Lord made all things. ".repeat(150);
  const chunks = bibleSpeechChunks(long);
  assert.ok(chunks.length > 10);
  assert.ok(chunks.every(t => t.length <= 160 && t.length > 0));
  assert.equal(chunks.join(" ").replace(/\s+/g, " "), long.trim());
  const chinese = "天地万物和平希望".repeat(80);
  const cjk = bibleSpeechChunks(chinese);
  assert.ok(cjk.length > 1);
  assert.equal(cjk.join(""), chinese);
  assert.deepEqual(bibleSpeechChunks(" \n  "), []);
});

test("full Bible reader shows sound for every edition, not only English", () => {
  const bible = read("src/routes/_authenticated/bible.tsx");
  const publicPassage = read("src/routes/passage.tsx");
  for (const s of [bible, publicPassage]) {
    assert.match(s, /<BibleReadAloud/);
    assert.match(s, /language=\{TRANSLATIONS\.find/);
    assert.doesNotMatch(s, /language === "English" && \(\s*<BibleReadAloud/);
  }
  assert.match(bible, /startVerse=\{verse\}/);
  assert.match(publicPassage, /label="selected verses"/);
});

test("player supports installed voice selection, live voice refresh and verse controls", () => {
  const player = read("src/components/nuru/BibleReadAloud.tsx");
  assert.match(player, /getVoices\(\)/);
  assert.match(player, /voiceschanged/);
  assert.match(player, /aria-label="Bible narration voice"/);
  assert.match(player, /Read with sound/);
  assert.match(player, /Skip to next verse/);
  assert.match(player, /Stop reading/);
  assert.match(player, /Bible reading speed/);
  assert.match(player, /bibleSpeechChunks\(verse\.text\)/);
  assert.match(player, /No \{language\} voice is installed/);
  assert.match(player, /generation\.current\+\+/);
  assert.match(player, /current\.current = null/);
});
