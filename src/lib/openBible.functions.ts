import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { EBIBLE_TRANSLATIONS } from "./bibleCatalog";
import { USFM_BOOK_CODE } from "./usfmBooks";
import { OLD_TESTAMENT, NEW_TESTAMENT } from "./bible";
import { parseOpenBibleChapter } from "./openBibleParse";

const schema = z.object({
  translation: z.string().max(100),
  book: z.string().max(40),
  chapter: z.number().int().min(1).max(150),
});
const cache = new Map<
  string,
  { data: ReturnType<typeof parseOpenBibleChapter>; expires: number }
>();
export const fetchOpenBibleChapter = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const edition = EBIBLE_TRANSLATIONS.find((t) => t.id === data.translation);
    const book = [...OLD_TESTAMENT, ...NEW_TESTAMENT].find((b) => b.name === data.book);
    const code = USFM_BOOK_CODE[data.book];
    if (!edition || !book || !code || data.chapter > book.chapters)
      throw new Error("Choose a valid Bible, book and chapter.");
    const key = `${edition.id}:${code}:${data.chapter}`;
    const cached = cache.get(key);
    let verses = cached && cached.expires > Date.now() ? cached.data : undefined;
    if (!verses) {
      const url = `https://ebible.org/${edition.slug}/${code}${String(data.chapter).padStart(2, "0")}.htm`;
      const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!response.ok)
        throw new Error(
          "This translation does not include that chapter, or its source is temporarily unavailable.",
        );
      verses = parseOpenBibleChapter(await response.text(), data.chapter);
      if (cache.size >= 300) cache.delete(cache.keys().next().value!);
      cache.set(key, { data: verses, expires: Date.now() + 60 * 60 * 1000 });
    }
    return {
      reference: `${data.book} ${data.chapter}`,
      translation: edition.label,
      translationId: edition.short,
      text: verses.map((v) => v.text).join(" "),
      verses,
    };
  });
