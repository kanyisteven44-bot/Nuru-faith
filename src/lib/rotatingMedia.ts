import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { resolveMedia } from "@/lib/media";
import { getPexelsPhotos, type PexelsCategory, type PexelsPhoto } from "@/lib/pexels.functions";

function hashKey(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

/**
 * Decorative Nuru imagery rotates every four hours. Each surface has its own
 * offset, so Home, Bible, Music and Courses do not all change to the same
 * photo at once. A pool is exhausted before that surface repeats an image.
 *
 * Content-owned images (event covers, reel posters, user uploads, series
 * covers) should stay fixed because they identify the content itself.
 */
export function useRotatingMedia(
  pool: readonly string[],
  surfaceKey: string,
  slotHours = 4,
): string {
  const slotMs = slotHours * 60 * 60 * 1000;
  const [slot, setSlot] = useState(0);

  useEffect(() => {
    const update = () => setSlot(Math.floor(Date.now() / slotMs));
    update();
    const timer = window.setInterval(update, Math.min(slotMs, 60_000));
    return () => window.clearInterval(timer);
  }, [slotMs]);

  return useMemo(() => {
    if (pool.length === 0) return resolveMedia(null);
    const offset = hashKey(surfaceKey) % pool.length;
    return resolveMedia(pool[(slot + offset) % pool.length]!);
  }, [pool, slot, surfaceKey]);
}

/** Pexels enhances decorative slots only; bundled images remain the offline fallback. */
export function usePexelsRotatingMedia(
  category: PexelsCategory,
  fallbackPool: readonly string[],
  surfaceKey: string,
): { src: string; credit: PexelsPhoto | null } {
  const fallback = useRotatingMedia(fallbackPool, surfaceKey);
  const [slot, setSlot] = useState(0);
  useEffect(() => {
    const update = () => setSlot(Math.floor(Date.now() / (4 * 60 * 60 * 1000)));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const photos = useQuery({
    queryKey: ["pexels-approved", category],
    queryFn: () => getPexelsPhotos({ data: { category } }),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  }).data;
  if (!photos?.length) return { src: fallback, credit: null };
  const photo = photos[(slot + hashKey(surfaceKey)) % photos.length]!;
  return { src: photo.src, credit: photo };
}

export const NURU_PHOTO_POOLS = {
  home: [
    "asset:mountain-dawn",
    "asset:walk-purpose",
    "asset:friends-dusk",
    "asset:cross-sunrise",
    "asset:bible-candle",
    "asset:quiet-night",
    "asset:topic-faith-purpose",
    "asset:topic-hope-healing",
  ],
  bible: [
    "asset:bible-candle",
    "asset:topic-faith",
    "asset:cross-sunrise",
    "asset:quiet-night",
    "asset:mountain-dawn",
    "asset:topic-discipleship",
    "asset:topic-prayer",
    "asset:topic-faith-purpose",
  ],
  music: [
    "asset:worship-night",
    "asset:church-interior",
    "asset:friends-dusk",
    "asset:cross-sunrise",
    "asset:mountain-dawn",
    "asset:quiet-night",
    "asset:topic-faith",
    "asset:topic-hope-healing",
  ],
  courses: [
    "asset:walk-purpose",
    "asset:topic-discipleship",
    "asset:topic-faith",
    "asset:topic-prayer",
    "asset:topic-personal-growth",
    "asset:topic-relationships",
    "asset:topic-life-skills",
    "asset:topic-faith-purpose",
    "asset:topic-hope-healing",
    "asset:friends-dusk",
  ],
  eventsFallback: [
    "asset:church-interior",
    "asset:worship-night",
    "asset:friends-dusk",
    "asset:cross-sunrise",
    "asset:mountain-dawn",
    "asset:topic-faith",
  ],
} as const;
