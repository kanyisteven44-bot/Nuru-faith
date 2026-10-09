import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  bibleSpeechLocale,
  bibleMatchingVoices,
  bibleDeviceVoiceStatus,
  isAfricanBibleLanguage,
} from "../src/lib/bibleSpeech.ts";

test("priority African editions resolve to distinct, language-correct locales", () => {
  const expected = {
    "Swahili": "sw-KE",
    "Kiswahili": "sw-KE",
    "Swahili, Tanzania": "sw-TZ",
    "Kiswahili Tanzania": "sw-TZ",
    "Swahili Congo": "sw-CD",
    "Kikuyu": "ki-KE",
    "Gikuyu": "ki-KE",
    "Dholuo": "luo-KE",
    "Kikamba": "kam-KE",
    "Kinyarwanda": "rw-RW",
    "Luganda": "lg-UG",
    "Amharic": "am-ET",
    "Oromo": "om-ET",
    "Tigrinya": "ti-ER",
    "Somali": "so-SO",
    "Hausa": "ha-NG",
    "Yoruba": "yo-NG",
    "Igbo": "ig-NG",
    "Zulu": "zu-ZA",
    "Xhosa": "xh-ZA",
    "Shona": "sn-ZW",
    "Chichewa": "ny-MW",
    "Bemba": "bem-ZM",
    "Twi": "tw-GH",
    "Afrikaans": "af-ZA",
    "Malagasy": "mg-MG",
    "Arabic, Sudanese Creole": "pga-SS",
  };
  for (const [language, locale] of Object.entries(expected)) {
    assert.equal(bibleSpeechLocale(language), locale, language);
    assert.equal(isAfricanBibleLanguage(language), true, language);
  }
  assert.equal(bibleSpeechLocale("sw-TZ"), "sw-TZ");
  assert.equal(bibleSpeechLocale("Unknown African language"), null);
  assert.equal(isAfricanBibleLanguage("French"), false);
});

test("confirmed narration requires an installed voice; no silent English fallback", () => {
  const english = { voiceURI: "en", lang: "en-US", name: "English" };
  const swahili = { voiceURI: "sw", lang: "sw-KE", name: "Kiswahili" };
  const tanzania = { voiceURI: "sw-tz", lang: "sw-TZ", name: "Swahili Tanzania" };
  assert.deepEqual(bibleMatchingVoices([english], "Swahili"), []);
  assert.equal(bibleDeviceVoiceStatus([english], "Swahili", true), "unavailable");
  assert.equal(bibleDeviceVoiceStatus([english], "Swahili", false), "checking");
  assert.equal(bibleDeviceVoiceStatus([english, swahili], "Swahili", true), "ready");
  assert.deepEqual(bibleMatchingVoices([english, swahili, tanzania], "Swahili Tanzania").map(v=>v.voiceURI),["sw-tz","sw"]);
  assert.equal(bibleDeviceVoiceStatus([english], "Swahili", true, "en"), "ready",
    "manual voice selection is explicitly allowed");
});

test("UI blocks wrong-language autoplay but supports deliberate alternate voices", () => {
  const s=readFileSync(new URL("../src/components/nuru/BibleReadAloud.tsx",import.meta.url),"utf8");
  assert.match(s, /disabled=\{!canPlay\}/);
  assert.match(s, /if \(!canPlay \|\| !chosen\)/);
  assert.match(s, /utterance\.voice = chosen/);
  assert.match(s, /Other voices \(may mispronounce\)/);
  assert.match(s, /Open Android Settings/);
  assert.match(s, /African-language Bible text is available/);
  assert.match(s, /voiceStatus === "checking"/);
  assert.match(s, /voiceschanged/);
  assert.match(s, /window\.clearTimeout\(timeout\)/);
  assert.doesNotMatch(s, /if \(chosen\) utterance\.voice = chosen/);
});
