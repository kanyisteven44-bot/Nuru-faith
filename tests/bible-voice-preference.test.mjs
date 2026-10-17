import test from "node:test";
import assert from "node:assert/strict";
import { bibleNarratorPreferenceScore } from "../src/lib/bibleSpeech.ts";

test("prioritizes clearly named feminine narrators", () => {
  assert.ok(
    bibleNarratorPreferenceScore({ name: "Samantha" }) >
      bibleNarratorPreferenceScore({ name: "David" }),
  );
});

test("recognizes natural voices and penalizes legacy voices", () => {
  assert.ok(
    bibleNarratorPreferenceScore({ name: "Natural Voice" }) >
      bibleNarratorPreferenceScore({ name: "eSpeak Legacy" }),
  );
});

test("does not match voice preference keywords embedded inside longer words", () => {
  assert.equal(bibleNarratorPreferenceScore({ name: "Supernaturalist" }), 0);
});

test("prefers remote voices only as a minor tie breaker", () => {
  assert.equal(
    bibleNarratorPreferenceScore({ name: "Neutral", localService: false }) -
      bibleNarratorPreferenceScore({ name: "Neutral", localService: true }),
    1,
  );
});
