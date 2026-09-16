import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { USFM_BOOK_CODE } from "./usfmBooks";
import { parseReference, parseVerses, type ApiBibleVerse } from "./apiBibleParse";

/**
 * NIV Scripture text via API.Bible (scripture.api.bible), the licensed
 * service backed by the American Bible Society / Biblica. NIV is copyrighted
 * (unlike the free bible-api.com KJV/WEB text elsewhere in this app), so this
 * requires an API.Bible account with NIV enabled on it — see BIBLE_API_KEY
 * below. The key stays server-side; it is never sent to the browser.
 *
 * Configure:
 * - BIBLE_API_KEY (required) — from your api.scripture.api.bible dashboard.
 * - BIBLE_API_BIBLE_ID (optional) — the exact Bible ID for the NIV edition
 *   your account is licensed for (find it under "My Bibles" in the
 *   dashboard). If omitted, this looks up an English Bible whose
 *   abbreviation is "NIV" and caches the id in memory.
 */

const API = "https://api.scripture.api.bible/v1";

export type ApiBiblePassage = {
  reference: string;
  translation: string;
  translationId: string;
  verses: ApiBibleVerse[];
};

const passageInput = z.object({ reference: z.string().trim().min(1).max(80) });

let cachedBibleId: string | null = null;

async function resolveBibleId(apiKey: string): Promise<string> {
  const configured = process.env["BIBLE_API_BIBLE_ID"];
  if (configured) return configured;
  if (cachedBibleId) return cachedBibleId;

  const res = await fetch(`${API}/bibles?language=eng`, { headers: { "api-key": apiKey } });
  if (!res.ok) throw new Error("Couldn't look up the NIV Bible ID");
  const json = (await res.json()) as { data?: { id: string; abbreviation?: string }[] };
  const niv = (json.data ?? []).find((b) => b.abbreviation === "NIV");
  if (!niv) throw new Error("NIV isn't enabled on this API.Bible account");
  cachedBibleId = niv.id;
  return niv.id;
}

/** Real NIV chapter text. Throws if NIV access isn't configured/available — callers should fall back to a public-domain translation. */
export const fetchNivPassage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => passageInput.parse(data))
  .handler(async ({ data }): Promise<ApiBiblePassage> => {
    const apiKey = process.env["BIBLE_API_KEY"];
    if (!apiKey) throw new Error("niv-not-configured");

    const { book, chapter } = parseReference(data.reference);
    const usfm = USFM_BOOK_CODE[book];
    if (!usfm) throw new Error(`Unknown book: ${book}`);

    const bibleId = await resolveBibleId(apiKey);
    const passageId = `${usfm}.${chapter}`;
    const params = new URLSearchParams({
      "content-type": "html",
      "include-verse-numbers": "true",
      "include-chapter-numbers": "false",
      "include-titles": "false",
      "include-footnotes": "false",
      "include-verse-spans": "false",
    });
    const res = await fetch(`${API}/bibles/${bibleId}/passages/${passageId}?${params}`, {
      headers: { "api-key": apiKey },
    });
    if (!res.ok) throw new Error(`API.Bible request failed (${res.status})`);
    const json = (await res.json()) as { data?: { content?: string; reference?: string } };
    const html = json.data?.content;
    if (!html) throw new Error("Empty NIV passage response");

    const verses = parseVerses(html, chapter);
    if (verses.length === 0) throw new Error("Couldn't parse NIV passage content");

    return {
      reference: json.data?.reference ?? data.reference,
      translation: "New International Version",
      translationId: "NIV",
      verses,
    };
  });
