const KEY = "nuru_saved_devotionals";

function storageKey(userId: string | null) {
  return `${KEY}:${userId ?? "guest"}`;
}

function readSet(userId: string | null): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function readSavedDevotionalIds(userId: string | null): Set<string> {
  return readSet(userId);
}

export function toggleSavedDevotional(userId: string | null, devotionalId: string): Set<string> {
  const ids = readSet(userId);
  if (ids.has(devotionalId)) ids.delete(devotionalId);
  else ids.add(devotionalId);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey(userId), JSON.stringify([...ids]));
  }
  return ids;
}
