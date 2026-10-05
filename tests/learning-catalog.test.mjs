import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

const read = (name) =>
  JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), "utf8"));

test("book catalogue has distinct editions with usable source, reading and EPUB links", () => {
  const books = read("christianBooks");
  assert.ok(books.length > 50);
  assert.equal(new Set(books.map((book) => book.id)).size, books.length);
  for (const book of books) {
    assert.ok(book.title && book.author && book.category);
    assert.equal(book.language, "English");
    for (const key of ["sourceUrl", "readUrl", "epubUrl"]) {
      const url = new URL(book[key]);
      assert.equal(url.protocol, "https:");
      assert.equal(url.hostname, "www.gutenberg.org");
    }
    assert.match(book.readUrl, /\.html$/);
    assert.match(book.epubUrl, /\.epub3\./);
  }
});

test("external courses point to distinct official classes", () => {
  const courses = read("externalCourses");
  assert.ok(courses.length >= 16);
  assert.equal(new Set(courses.map((course) => course.url)).size, courses.length);
  for (const course of courses) {
    const url = new URL(course.url);
    assert.equal(url.protocol, "https:");
    assert.equal(url.hostname, "bibleproject.com");
    assert.match(url.pathname, /^\/classroom\/[^/]+\/?$/);
    assert.ok(course.title);
  }
});
