import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import books from "@/data/christianBooks.json";
import { splitBookText } from "./bookReader";

const approvedIds = new Set(books.map((book) => book.id));
const input = z.object({
  id: z
    .number()
    .int()
    .refine((id) => approvedIds.has(id), "Unknown book"),
  section: z.number().int().min(0).max(20000).default(0),
});
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_CACHE_BYTES = 16 * 1024 * 1024;
const cache = new Map<number, { sections: string[]; bytes: number; expires: number }>();
const pending = new Map<number, Promise<string[]>>();

async function loadText(id: number): Promise<string[]> {
  const cached = cache.get(id);
  if (cached && cached.expires > Date.now()) {
    cache.delete(id);
    cache.set(id, cached);
    return cached.sections;
  }
  cache.delete(id);
  const existing = pending.get(id);
  if (existing) return existing;
  if (pending.size >= 3) throw new Error("The reading room is busy. Try again in a moment.");
  const task = (async () => {
    // Fetch ebook files only. Never scrape catalogue pages or accept caller-provided URLs.
    const response = await fetch(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`, {
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    if (!response.ok || !response.headers.get("content-type")?.includes("text/plain"))
      throw new Error("This edition could not be loaded. Try again or open its source edition.");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("This edition has no reading text.");
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BYTES) {
          await reader.cancel();
          throw new Error(
            "This edition is too large for the in-app reader. Open the source edition instead.",
          );
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const body = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.length;
    }
    const text = new TextDecoder().decode(body);
    // An upstream error page must never be presented as a book.
    if (!/project gutenberg/i.test(text) || !/\*\*\*\s*END OF/i.test(text))
      throw new Error("The source did not return a complete book. Open its source edition.");
    const sections = splitBookText(text);
    if (!sections.length) throw new Error("This edition has no reading text.");
    const storedBytes = text.length * 2;
    let used = [...cache.values()].reduce((total, item) => total + item.bytes, 0);
    while (cache.size && (cache.size >= 12 || used + storedBytes > MAX_CACHE_BYTES)) {
      const oldest = cache.keys().next().value!;
      used -= cache.get(oldest)!.bytes;
      cache.delete(oldest);
    }
    if (storedBytes <= MAX_CACHE_BYTES)
      cache.set(id, { sections, bytes: storedBytes, expires: Date.now() + 3600000 });
    return sections;
  })();
  pending.set(id, task);
  try {
    return await task;
  } finally {
    pending.delete(id);
  }
}

export const fetchBookSection = createServerFn({ method: "GET" })
  .validator((data: unknown) => input.parse(data))
  .handler(async ({ data }) => {
    const sections = await loadText(data.id);
    const section = Math.min(data.section, sections.length - 1);
    return { text: sections[section]!, section, total: sections.length };
  });
