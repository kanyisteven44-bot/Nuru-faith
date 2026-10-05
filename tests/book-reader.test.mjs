import test from "node:test";
import assert from "node:assert/strict";
import { splitBookText, parseReaderPreferences } from "../src/lib/bookReader.ts";

const words = (text) => text.trim().split(/\s+/);
test("reading sections preserve source words and the complete licence", () => {
  const text = `*** START OF THE PROJECT GUTENBERG EBOOK ***\r\n\r\n${"A faithful reader keeps every word. ".repeat(1800)}\r\n\r\n*** END OF THE PROJECT GUTENBERG EBOOK ***\r\n\r\nFULL PROJECT GUTENBERG LICENSE`;
  const sections = splitBookText(text);
  assert.ok(sections.length > 2);
  assert.ok(sections.every((section) => section.length <= 6000));
  assert.deepEqual(words(sections.join("\n\n")), words(text));
  assert.match(sections.at(-1), /FULL PROJECT GUTENBERG LICENSE/);
});
test("reader recovers from broken, unsafe and obsolete device preferences", () => {
  const defaults = { section: 0, size: 20, font: "serif", tone: "app" };
  assert.deepEqual(parseReaderPreferences("{broken"), defaults);
  assert.deepEqual(
    parseReaderPreferences(
      JSON.stringify({ section: -3, size: 900, font: "<script>", tone: "unknown" }),
    ),
    defaults,
  );
  assert.deepEqual(
    parseReaderPreferences(JSON.stringify({ section: 23, size: 24, font: "sans", tone: "night" })),
    { section: 23, size: 24, font: "sans", tone: "night" },
  );
});
