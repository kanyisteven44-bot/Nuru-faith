/** Ignore stale or malformed lesson indices when a course changes. */
export function courseProgress(indices: Iterable<number>, lessonCount: number) {
  const completed = new Set(
    [...indices].filter((index) => Number.isInteger(index) && index >= 0 && index < lessonCount),
  );
  let nextLesson = 0;
  while (nextLesson < lessonCount && completed.has(nextLesson)) nextLesson++;
  return {
    completed,
    percent: lessonCount > 0 ? Math.round((completed.size / lessonCount) * 100) : 0,
    nextLesson: nextLesson < lessonCount ? nextLesson : null,
    finished: lessonCount > 0 && completed.size === lessonCount,
  };
}
