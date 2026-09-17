const WATCHED_EXTERNAL_REELS_KEY = "nuru_watched_external_reels";

export function parseWatchedExternalReelIds(value: string | null): Set<string> {
  if (!value) return new Set();
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string" && id.length > 0));
  } catch {
    return new Set();
  }
}

function storageKey(userId: string | null) {
  return `${WATCHED_EXTERNAL_REELS_KEY}:${userId ?? "guest"}`;
}

export function readWatchedExternalReelIds(userId: string | null): Set<string> {
  if (typeof window === "undefined") return new Set();
  return parseWatchedExternalReelIds(window.localStorage.getItem(storageKey(userId)));
}

export function rememberWatchedExternalReel(userId: string | null, contentId: string) {
  if (typeof window === "undefined" || !contentId) return;
  const ids = readWatchedExternalReelIds(userId);
  ids.add(contentId);
  window.localStorage.setItem(storageKey(userId), JSON.stringify([...ids]));
}
