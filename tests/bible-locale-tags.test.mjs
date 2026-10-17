import test from "node:test";
import assert from "node:assert/strict";
import { bibleSpeechLocale, bibleMatchingVoices } from "../src/lib/bibleSpeech.ts";

test("catalog locale tags accept underscores, casing, scripts and numeric regions", () => {
  for (const [input, expected] of [["sw_KE","sw-KE"], [" EN-gb ","en-GB"], ["zh_Hant_TW","zh-Hant-TW"], ["es-419","es-419"], ["ki","ki"]])
    assert.equal(bibleSpeechLocale(input), expected, input);
});
test("malformed tags and unknown language descriptions do not choose a fallback language", () => {
  for (const input of ["", "xx--YY", "en-US-US", "not_a_language", "Unidentified endangered language"])
    assert.equal(bibleSpeechLocale(input), null, input);
});
test("underscore-tagged Swahili editions find only matching installed voices", () => {
  const voices = [{lang:"en-US",name:"English",voiceURI:"en"},{lang:"sw-KE",name:"Swahili",voiceURI:"sw"}];
  assert.deepEqual(bibleMatchingVoices(voices,"sw_KE").map(v=>v.voiceURI),["sw"]);
  assert.deepEqual(bibleMatchingVoices(voices,"ki_KE"),[]);
});
