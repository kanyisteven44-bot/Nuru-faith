import { useEffect, useMemo, useState } from "react";
import { resolveMedia } from "@/lib/media";

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
