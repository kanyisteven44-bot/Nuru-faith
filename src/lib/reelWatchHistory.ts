const WATCHED_EXTERNAL_REELS_KEY = "nuru_watched_external_reels";
const MAX_DAILY_WATCHED_IDS = 20_000;

type DailyWatchHistory = {
  day: string;
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
  today = currentLocalDay(),
): Set<string> {
  if (!value) return new Set();
  try {
    const parsed: unknown = JSON.parse(value);

    // Backwards compatibility with the old all-time array format. Treat it as
    // today's list once; the next write migrates it to the daily structure.
    if (Array.isArray(parsed)) return cleanIds(parsed);

    if (!parsed || typeof parsed !== "object") return new Set();
    const history = parsed as Partial<DailyWatchHistory>;
    if (history.day !== today) return new Set();
    return cleanIds(history.ids);
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
  const boundedIds = [...ids].slice(-MAX_DAILY_WATCHED_IDS);
  const payload: DailyWatchHistory = { day: currentLocalDay(), ids: boundedIds };
  window.localStorage.setItem(storageKey(userId), JSON.stringify(payload));
}
