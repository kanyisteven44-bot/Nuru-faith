import type { FaithCourse, FaithCourseLesson } from "../data/faithCourses";

export function courseLessonContent(course: FaithCourse, lesson: FaithCourseLesson) {
  return (
    lesson.content ?? {
      context: `${lesson.focus} Begin by reading the whole passage around ${lesson.references.join(" and ")}, not only the quoted verse. Ask who is speaking, who is listening, what problem is being addressed, and what comes immediately before and after.`,
      meaning: `${course.description} In this lesson, the goal is not merely to collect information. Look for what the passage reveals about God's character, human motives, the work of Christ, and the kind of response Scripture calls faithful.`,
      practice:
        "Turn the lesson into one concrete response this week. Keep it specific enough to practise and small enough to repeat. Christian formation usually happens through faithful patterns over time, not one intense moment.",
      examples: course.examples,
      reflection: [
        "What does this lesson reveal about God?",
        "What does it expose or encourage in your own life?",
        "What is one faithful response you can practise before the next lesson?",
      ],
    }
  );
}

export function courseLessonText(course: FaithCourse, lesson: FaithCourseLesson) {
  const content = courseLessonContent(course, lesson);
  return [
    `Context\n${content.context}`,
    `What it means\n${content.meaning}`,
    `Real-life examples\n${content.examples.join("\n")}`,
    `Put it into practice\n${content.practice}`,
    `Reflect\n${content.reflection.join("\n")}`,
  ].join("\n\n");
}
