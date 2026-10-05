import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Editorially selected photo IDs. Never search arbitrary terms on every page view:
// those results can be off-topic and would consume the API quota quickly.
const approvedIds = {
  home: [9407893, 1105392, 10615070],
  bible: [11696719, 34612053, 5206052],
  courses: [11696719, 9407893, 12822942],
  music: [34611897, 213207, 36117935],
  eventsFallback: [12825610, 1429881, 34611897],
} as const;

export type PexelsCategory = keyof typeof approvedIds;
export type PexelsPhoto = {
  id: number;
  src: string;
  url: string;
  photographer: string;
  alt: string;
};

const photoSchema = z.object({
  id: z.number(),
  url: z.string().url(),
  photographer: z.string(),
  alt: z.string().nullable().optional(),
  src: z.object({ landscape: z.string().url() }),
});

const DAY = 24 * 60 * 60 * 1000;
const cache = new Map<PexelsCategory, { until: number; photos: PexelsPhoto[] }>();
const pending = new Map<PexelsCategory, Promise<PexelsPhoto[]>>();

async function loadCategory(category: PexelsCategory): Promise<PexelsPhoto[]> {
  const key = process.env["PEXELS_API_KEY"];
  if (!key) return [];
  const cached = cache.get(category);
  if (cached && cached.until > Date.now()) return cached.photos;
  const inFlight = pending.get(category);
  if (inFlight) return inFlight;

  const request = Promise.all(
    approvedIds[category].map(async (id): Promise<PexelsPhoto | null> => {
      try {
        const response = await fetch(`https://api.pexels.com/v1/photos/${id}`, {
          headers: { Authorization: key },
          signal: AbortSignal.timeout(4500),
        });
        if (!response.ok) return null;
        const parsed = photoSchema.safeParse(await response.json());
        if (!parsed.success) return null;
        const photo = parsed.data;
        if (
          new URL(photo.url).hostname !== "www.pexels.com" ||
          new URL(photo.src.landscape).hostname !== "images.pexels.com"
        )
          return null;
        return {
          id: photo.id,
          src: photo.src.landscape,
          url: photo.url,
          photographer: photo.photographer,
          alt: photo.alt ?? "",
        };
      } catch {
        return null;
      }
    }),
  )
    .then((photos) => {
      const valid = photos.filter((photo): photo is PexelsPhoto => photo !== null);
      cache.set(category, { photos: valid, until: Date.now() + (valid.length ? DAY : 5 * 60_000) });
      return valid;
    })
    .finally(() => pending.delete(category));
  pending.set(category, request);
  return request;
}

export const getPexelsPhotos = createServerFn({ method: "GET" })
  .validator(
    z.object({ category: z.enum(["home", "bible", "courses", "music", "eventsFallback"]) }),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }): Promise<PexelsPhoto[]> => loadCategory(data.category));
