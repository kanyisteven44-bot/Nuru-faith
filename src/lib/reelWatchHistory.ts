const WATCHED_EXTERNAL_REELS_KEY = "nuru_watched_external_reels";
const MAX_CACHED_WATCHED_IDS = 20_000;

type WatchHistory = {
  ids: string[];
};

export function currentLocalDay(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function cleanIds(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0));
}

export function parseWatchedExternalReelIds(
  value: string | null,
  _today = currentLocalDay(),
): Set<string> {
  if (!value) return new Set();
  try {
    const parsed: unknown = JSON.parse(value);

    // Backwards compatibility:
    // - the oldest format was a plain array
    // - the previous format was { day, ids } and reset at midnight
    // Both now migrate to one all-time set so a watched Reel stays watched.
    if (Array.isArray(parsed)) return cleanIds(parsed);
    if (!parsed || typeof parsed !== "object") return new Set();
    return cleanIds((parsed as Partial<WatchHistory>).ids);
  } catch {
    return new Set();
  }
}

function storageKey(userId: string | null) {
  return `${WATCHED_EXTERNAL_REELS_KEY}:${userId ?? "guest"}`;
}

export function readWatchedExternalReelIds(userId: string | null): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return parseWatchedExternalReelIds(window.localStorage.getItem(storageKey(userId)));
  } catch {
    return new Set();
  }
}

export function rememberWatchedExternalReel(userId: string | null, contentId: string) {
  if (typeof window === "undefined" || !contentId) return;
  const ids = readWatchedExternalReelIds(userId);
  ids.add(contentId);
  const boundedIds = [...ids].slice(-MAX_CACHED_WATCHED_IDS);
  const payload: WatchHistory = { ids: boundedIds };
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(payload));
  } catch {
    /* restricted storage must not interrupt playback */
  }
}
