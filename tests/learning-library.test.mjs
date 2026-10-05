import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");
const books = [...read("src/lib/bible.ts").matchAll(/\{ name: "([^"]+)", chapters: (\d+) \}/g)].map(
  (match) => ({ name: match[1], chapters: Number(match[2]) }),
);
function load(path) {
  const module = { exports: {} };
  const code = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (name) => {
      if (name === "@/lib/bible")
        return { OLD_TESTAMENT: books.slice(0, 39), NEW_TESTAMENT: books.slice(39) };
      if (name === "./chapterStudies") return load("src/data/chapterStudies.ts");
      throw new Error(`Unexpected catalogue dependency: ${name}`);
    },
  });
  return module.exports;
}
const studies = load("src/data/chapterStudies.ts").CHAPTER_STUDIES;
const courses = load("src/data/faithCourses.ts").FAITH_COURSES;

test("guided studies cover every Bible chapter with valid references and unique slugs", () => {
  assert.equal(books.length, 66);
  assert.equal(studies.length, 609);
  assert.equal(new Set(studies.map((study) => study.slug)).size, studies.length);
  const coverage = new Map();
  for (const study of studies) {
    assert.equal(study.guidedStudy, true);
    assert.ok(study.lessons.length >= 2);
    for (const lesson of study.lessons.slice(0, -1)) {
      const reference = lesson.references[0];
      const book = books.find((book) => reference.startsWith(`${book.name} `));
      assert.ok(book, reference);
      const chapter = Number(reference.slice(book.name.length + 1));
      assert.ok(chapter >= 1 && chapter <= book.chapters, reference);
      assert.equal(coverage.has(reference), false, `Repeated chapter: ${reference}`);
      coverage.set(reference, true);
    }
  }
  assert.equal(coverage.size, 1189);
  for (const book of books)
    for (let chapter = 1; chapter <= book.chapters; chapter++)
      assert.ok(coverage.has(`${book.name} ${chapter}`));
});

test("expanded courses retain the original courses without broken or duplicate routes", () => {
  assert.ok(courses.length >= 609 && courses.length <= 1000);
  assert.equal(new Set(courses.map((course) => course.slug)).size, courses.length);
  assert.ok(courses.some((course) => course.slug === "understanding-baptism"));
  assert.ok(courses.some((course) => course.slug === "how-to-pray"));
  for (const course of courses) {
    assert.ok(course.lessons.length > 0, course.slug);
    assert.ok(
      course.lessons.every((lesson) => lesson.references.length > 0 && lesson.focus.length > 30),
      course.slug,
    );
  }
});
