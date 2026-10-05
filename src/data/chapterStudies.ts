import { OLD_TESTAMENT, NEW_TESTAMENT } from "@/lib/bible";
import type { FaithCourse } from "./faithCourses";

/** Distinct, passage-based study units. These are guided studies, not accredited classes. */
export const CHAPTER_STUDIES: FaithCourse[] = [...OLD_TESTAMENT, ...NEW_TESTAMENT].flatMap(
  (book, index) => {
    const genre =
      index < 5
        ? "Law & covenant"
        : index < 17
          ? "Biblical history"
          : index < 22
            ? "Poetry & wisdom"
            : index < 39
              ? "Prophets"
              : index < 43
                ? "The Gospels"
                : index === 43
                  ? "The early church"
                  : index < 65
                    ? "Letters to the church"
                    : "Apocalyptic hope";
    const approach =
      index < 5
        ? "Notice covenant promises, the setting of each command, and its relationship to Israel’s worship and community."
        : index < 17 || index === 43
          ? "Follow the people, places and sequence of events. A description of someone’s action is not always an instruction to imitate it."
          : index < 22
            ? "Read the imagery slowly. Compare parallel lines, distinguish lament from advice, and avoid turning a proverb into a guarantee."
            : index < 39
              ? "Identify the prophet’s audience and historical setting. Notice calls to justice and repentance alongside promises of restoration."
              : index < 43
                ? "Follow Jesus’ words and actions in their immediate setting. Compare how the people around him respond."
                : index < 65
                  ? "Identify the writer, recipients and issue being addressed. Follow the argument before applying an individual sentence."
                  : "Notice symbols, repeated images and the hope offered to the original audience. Avoid guessing dates from isolated details.";
    return Array.from({ length: Math.ceil(book.chapters / 2) }, (_, part) => {
      const first = part * 2 + 1;
      const last = Math.min(first + 1, book.chapters);
      const references = Array.from(
        { length: last - first + 1 },
        (_, offset) => `${book.name} ${first + offset}`,
      );
      return {
        slug: `study-${book.name.toLowerCase().replace(/\s+/g, "-")}-${first}-${last}`,
        title: `${book.name} ${first}${last > first ? `–${last}` : ""}: Guided Study`,
        category: genre,
        description: `A self-guided Scripture study of ${references.join(" and ")}. Read the full passage, work through observation questions, and choose one thoughtful response. ${approach}`,
        cover: "asset:reading-scripture",
        level: "Growing" as const,
        estimatedMinutes: (references.length + 1) * 18,
        guidedStudy: true,
        examples: [
          "Write down a claim the passage actually makes and the verses that support it.",
          "Discuss a difficult question with a trusted mentor instead of forcing a quick answer.",
          "Choose one practical response that fits the passage’s purpose and your circumstances.",
        ],
        lessons: [
          ...references.map((reference) => ({
            title: `Read ${reference}`,
            references: [reference],
            focus: `Read ${reference} in full. ${approach} Note repeated words, turning points and questions you want to investigate.`,
          })),
          {
            title: "Reflect & respond",
            references,
            focus: `Revisit ${references.join(" and ")}. Summarise the main idea in your own words. What evidence supports it? Where might your assumptions need to change? Choose a response shaped by the passage rather than by an isolated phrase.`,
          },
        ],
      };
    });
  },
);
