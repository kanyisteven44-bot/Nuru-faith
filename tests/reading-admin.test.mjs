import test from "node:test";
import assert from "node:assert/strict";
import { readingAudioSections } from "../src/lib/readingAudio.ts";
import { assertSuperAdmin, assertAdminWriteAssurance } from "../src/lib/adminDirectoryAccess.ts";

test("read aloud preserves lesson words across mobile-sized utterances", () => {
  const input = "A lesson includes real context and practical questions. ".repeat(60).trim();
  const sections = readingAudioSections([null, "", input]);
  assert.ok(sections.length > 1);
  assert.ok(sections.every((s) => s.text.length <= 220));
  assert.equal(sections.map((s) => s.text).join(" "), input);
});
test("read aloud chunks text without sentence punctuation", () => {
  const text = Array.from({ length: 200 }, () => "understanding").join(" ");
  const sections = readingAudioSections([text]);
  assert.ok(sections.every((s) => s.text.length <= 220));
  assert.equal(sections.map((s) => s.text).join(" "), text);
});
test("directory refuses missing roles, moderators, church admins and failed lookups", () => {
  for (const roles of [null, [], [{ role: "moderator" }], [{ role: "church_admin" }]])
    assert.throws(() => assertSuperAdmin(roles));
  assert.throws(() => assertSuperAdmin([{ role: "super_admin" }], true));
  assert.doesNotThrow(() => assertSuperAdmin([{ role: "super_admin" }]));
});
test("directory writes require verified AAL2 rather than role alone", () => {
  for (const level of [undefined, null, "aal1", "", true])
    assert.throws(() => assertAdminWriteAssurance(level));
  assert.doesNotThrow(() => assertAdminWriteAssurance("aal2"));
});
