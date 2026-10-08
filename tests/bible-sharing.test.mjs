import { test } from "node:test";
import assert from "node:assert/strict";
import { verseRanges, parseVerseRanges, buildBibleShare } from "../src/lib/bibleSharing.ts";
import { parseOpenBibleChapter } from "../src/lib/openBibleParse.ts";
import { classifyLicense } from "../scripts/bible/license.mjs";

test("verse ranges preserve disjoint selections and reject invalid links", () => {
  assert.equal(verseRanges([8, 2, 1, 2, 7, 5]), "1-2,5,7-8");
  assert.deepEqual(parseVerseRanges("1-2,5,7-8"), [1, 2, 5, 7, 8]);
  for (const bad of ["0", "2-1", "1-201", "16,foo", "1e2", "1-999999"])
    assert.deepEqual(parseVerseRanges(bad), []);
});
test("shares retain only selected chapter verses, the edition and its attribution", () => {
  const share = buildBibleShare({
    origin: "https://nurufaith.website",
    book: "John",
    chapter: 3,
    translation: "ebible:swhulb",
    translationLabel: "Swahili ULB",
    verses: [
      { chapter: 3, verse: 16, text: "Exact verse sixteen" },
      { chapter: 3, verse: 17, text: "Exact verse seventeen" },
      { chapter: 4, verse: 16, text: "Wrong chapter" },
      { chapter: 3, verse: 18, text: "Not selected" },
    ],
    selected: [17, 16],
    attribution: "© Translator · CC BY-SA\nhttps://creativecommons.org/licenses/by-sa/4.0/",
  });
  assert.equal(share.title, "John 3:16-17");
  assert.match(share.text, /16 Exact verse sixteen\n\n17 Exact verse seventeen/);
  assert.doesNotMatch(share.text, /Wrong chapter|Not selected/);
  assert.match(share.text, /© Translator/);
  const url = new URL(share.url);
  assert.equal(url.pathname, "/passage");
  assert.equal(url.searchParams.get("translation"), "ebible:swhulb");
  assert.equal(url.searchParams.get("verses"), "16-17");
  assert.throws(
    () =>
      buildBibleShare({
        origin: url.origin,
        book: "John",
        chapter: 3,
        translation: "web",
        translationLabel: "WEB",
        verses: [],
        selected: [],
      }),
    /Select/,
  );
});
test("HTML reader keeps poetry and emphasis without footnotes or navigation", () => {
  const rows = parseOpenBibleChapter(
    `<div class="main"><div class="chapterlabel">3</div><p><span class="verse" id="V1">1</span>First <em>line</em><a class="notemark">a</a>.</p><div class="q">Poetry &amp; words.</div><p><span class="verse" id="V2">2</span>Second verse.</p><div class="footnote">Footnote content</div><ul class="tnav">Next chapter</ul><div class="copyright">Copyright footer</div></div>`,
    3,
  );
  assert.deepEqual(rows, [
    { chapter: 3, verse: 1, text: "First line. Poetry & words." },
    { chapter: 3, verse: 2, text: "Second verse." },
  ]);
  assert.throws(() => parseOpenBibleChapter("<h1>Page missing</h1>", 3), /does not include/);
});
test("license import excludes restrictive or unverified reuse terms", () => {
  assert.equal(
    classifyLicense('<a href="https://creativecommons.org/licenses/by-nc/4.0/">CC</a>', false),
    null,
  );
  assert.equal(
    classifyLicense('<a href="https://creativecommons.org/licenses/by-nd/4.0/">CC</a>', false),
    null,
  );
  assert.equal(classifyLicense("All rights reserved", true), null);
  assert.equal(classifyLicense("Public Domain", false), null);
  assert.equal(classifyLicense("Public Domain", true).license, "Public domain");
  assert.equal(
    classifyLicense('<a href="http://creativecommons.org/licenses/by-sa/4.0/">CC</a>', false)
      .license,
    "CC BY-SA",
  );
});
