import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { courseLessonContent, courseLessonText } from "../src/lib/courseLesson.ts";
const courses = JSON.parse(
  readFileSync(new URL("../src/data/extendedFaithCourses.json", import.meta.url), "utf8"),
);

test("extended courses contain substantial distinct lessons and practical learning", () => {
  assert.equal(courses.length, 4);
  const meanings = new Set();
  for (const course of courses) {
    assert.equal(course.lessons.length, 3);
    assert.equal(course.extended, true);
    for (const lesson of course.lessons) {
      const content = courseLessonContent(course, lesson);
      const words = [
        content.context,
        content.meaning,
        content.practice,
        ...content.examples,
        ...content.reflection,
      ]
        .join(" ")
        .split(/\s+/).length;
      assert.ok(words >= 400, `${lesson.title}: ${words} words`);
      assert.ok(content.reflection.length >= 2);
      assert.ok(lesson.references.length > 0);
      assert.ok(!meanings.has(content.meaning));
      meanings.add(content.meaning);
      const offline = courseLessonText(course, lesson);
      for (const text of [
        content.context,
        content.meaning,
        content.practice,
        ...content.examples,
        ...content.reflection,
      ])
        assert.ok(offline.includes(text));
    }
  }
  assert.equal(meanings.size, 12);
});

test("original lessons retain their study prompts and course examples", () => {
  const course = { description: "Original course description", examples: ["Original example"] };
  const lesson = { focus: "Original lesson focus", references: ["Mark 4:1-20"] };
  const content = courseLessonContent(course, lesson);
  assert.match(content.context, /Original lesson focus/);
  assert.match(content.meaning, /Original course description/);
  assert.deepEqual(content.examples, course.examples);
  assert.ok(courseLessonText(course, lesson).includes("Original example"));
});
