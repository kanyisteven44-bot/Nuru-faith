import { test } from "node:test";
import assert from "node:assert/strict";
import { parseReference, decodeEntities, parseVerses } from "../src/lib/apiBibleParse.ts";

test("parses a plain book + chapter reference", () => {
  assert.deepEqual(parseReference("John 3"), { book: "John", chapter: 3 });
  assert.deepEqual(parseReference("1 Corinthians 13"), { book: "1 Corinthians", chapter: 13 });
  assert.deepEqual(parseReference("Song of Solomon 2"), { book: "Song of Solomon", chapter: 2 });
});

test("rejects a reference with no chapter number", () => {
  assert.throws(() => parseReference("John"));
});

test("decodes the HTML entities API.Bible content commonly contains", () => {
  assert.equal(
    decodeEntities("Jacob&#39;s ladder &amp; the &quot;stairway&quot;"),
    `Jacob's ladder & the "stairway"`,
  );
});

test("splits a realistic API.Bible chapter passage into numbered verses", () => {
  const html = [
    '<div class="p">',
    '<span class="v" data-number="16" data-sid="JHN 3:16">16</span>',
    "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.",
    '<span class="v" data-number="17" data-sid="JHN 3:17">17</span>',
    "For God did not send his Son into the world to condemn the world, but in order that the world might be saved through him.",
    "</div>",
  ].join(" ");

  const verses = parseVerses(html, 3);
  assert.equal(verses.length, 2);
  assert.deepEqual(verses[0], {
    chapter: 3,
    verse: 16,
    text: "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.",
  });
  assert.equal(verses[1].verse, 17);
  assert.match(verses[1].text, /^For God did not send his Son/);
});

test("verse text does not swallow the following verse's marker or number", () => {
  const html =
    '<span class="v" data-number="1" data-sid="GEN 1:1">1</span>In the beginning God created the heavens and the earth.' +
    '<span class="v" data-number="2" data-sid="GEN 1:2">2</span>Now the earth was formless and empty.';
  const verses = parseVerses(html, 1);
  assert.equal(verses.length, 2);
  assert.ok(
    !verses[0].text.includes("2"),
    "verse 1 text should not contain the verse 2 marker digit",
  );
  assert.equal(verses[0].text, "In the beginning God created the heavens and the earth.");
});

test("verse numbers with two or more digits are handled (Psalm-length chapters)", () => {
  const html =
    '<span class="v" data-number="118" data-sid="PSA 119:118">118</span>You reject all who stray from your decrees.' +
    '<span class="v" data-number="119" data-sid="PSA 119:119">119</span>All the wicked of the earth you discard like dross.';
  const verses = parseVerses(html, 119);
  assert.deepEqual(
    verses.map((v) => v.verse),
    [118, 119],
  );
});

test("strips inline formatting tags (e.g. small-caps LORD) from verse text", () => {
  const html =
    '<span class="v" data-number="1" data-sid="PSA 23:1">1</span>The <span class="nd">Lord</span> is my shepherd; I lack nothing.';
  const verses = parseVerses(html, 23);
  assert.equal(verses[0].text, "The Lord is my shepherd; I lack nothing.");
});

test("returns no verses for content with no verse markers", () => {
  assert.deepEqual(parseVerses("<div class='p'>no markers here</div>", 1), []);
});
