import test from "node:test";
import assert from "node:assert/strict";
import { courseProgress } from "../src/lib/courseProgress.ts";

test("resumes at the first unfinished lesson, including gaps", () => {
  assert.equal(courseProgress([], 4).nextLesson, 0);
  assert.equal(courseProgress([0, 1], 4).nextLesson, 2);
  assert.equal(courseProgress([0, 2, 3], 4).nextLesson, 1);
});

test("stale, duplicate and invalid indices cannot inflate completion", () => {
  const result = courseProgress([0, 0, -1, 9, 1.5, NaN], 2);
  assert.equal(result.percent, 50);
  assert.deepEqual([...result.completed], [0]);
  assert.equal(result.finished, false);
});

test("finished courses have no unfinished lesson and empty courses never divide by zero", () => {
  assert.equal(courseProgress([0, 1], 2).nextLesson, null);
  assert.equal(courseProgress([0, 1], 2).finished, true);
  assert.equal(courseProgress([0, 1], 2).percent, 100);
  assert.equal(courseProgress([], 0).percent, 0);
  assert.equal(courseProgress([], 0).finished, false);
});
