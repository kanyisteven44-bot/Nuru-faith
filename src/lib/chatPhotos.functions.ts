import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * A photography-only collection sourced from Lorem Picsum's curated Unsplash
 * photographs. These are photographic works by real photographers, not
 * AI-generated illustrations. We retain the original Unsplash photo URL and
 * author for attribution. Photo metadata is refreshed daily; individual
 * images are served at small sizes only when a member views them.
 *
 * 50 front-page photographic themes + 200 extra gallery photos. They are
 * remotely hosted, not 250 preloaded multi-megabyte files in the app bundle.
 */
export type RealChatPhoto = {
  id: string;
  author: string;
  sourceUrl: string;
  thumbnailUrl: string;
  wallpaperUrl: string;
};

type RawPhoto = {
  id: string;
  author: string;
  url: string;
  width: number;
  height: number;
};

const TOTAL = 250;
const PAGE_SIZE = 30;
const PAGES = 9;
const DAY = 86_400_000;
let cached: { until: number; items: RealChatPhoto[] } | null = null;
let pending: Promise<RealChatPhoto[]> | null = null;

function safeSource(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname === "unsplash.com" &&
      url.pathname.startsWith("/photos/");
  } catch {
    return false;
  }
}

function validPhoto(value: unknown): value is RawPhoto {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string" && /^\d{1,6}$/.test(row.id) &&
    typeof row.author === "string" && row.author.trim().length > 0 &&
    typeof row.url === "string" && safeSource(row.url) &&
    typeof row.width === "number" && row.width >= 600 &&
    typeof row.height === "number" && row.height >= 600;
}

async function loadCatalogue(): Promise<RealChatPhoto[]> {
  if (cached && cached.until > Date.now()) return cached.items;
  if (pending) return pending;

  pending = (async () => {
    const pages = await Promise.allSettled(
      Array.from({ length: PAGES }, async (_, page) => {
        const result = await fetch(
          `https://picsum.photos/v2/list?page=${page + 1}&limit=${PAGE_SIZE}`,
          { signal: AbortSignal.timeout(8_000), headers: { Accept: "application/json" } },
        );
        if (!result.ok) throw new Error(`Photo provider returned ${result.status}`);
        const rows: unknown = await result.json();
        if (!Array.isArray(rows)) throw new Error("Invalid photograph metadata");
        return rows.filter(validPhoto);
      }),
    );

    const unique = new Map<string, RealChatPhoto>();
    for (const page of pages) {
      if (page.status !== "fulfilled") continue;
      for (const photo of page.value) {
        if (unique.has(photo.id)) continue;
        unique.set(photo.id, {
          id: photo.id,
          author: photo.author.trim().slice(0, 100),
          sourceUrl: photo.url,
          thumbnailUrl: `https://picsum.photos/id/${photo.id}/240/320.webp`,
          wallpaperUrl: `https://picsum.photos/id/${photo.id}/640/960.webp`,
        });
      }
    }

    const items = [...unique.values()].slice(0, TOTAL);
    // Never replace a complete in-memory gallery with a partial outage.
    if (!cached || items.length >= cached.items.length) {
      cached = { until: Date.now() + (items.length >= TOTAL ? DAY : 5 * 60_000), items };
    }
    return cached.items;
  })().finally(() => { pending = null; });

  return pending;
}

export const getRealChatPhotos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<RealChatPhoto[]> => loadCatalogue());
