type QueueReel = {
  id: string;
  source_type: string;
  external_id: string | null;
  video_url?: string | null;
  external_url?: string | null;
};
export function reelContentKey(reel: QueueReel): string {
  if (reel.source_type === "youtube" && reel.external_id) return reel.external_id;
  const url = reel.video_url || reel.external_url;
  if (url) {
    try {
      const parsed = new URL(url);
      parsed.hash = "";
      // Signed storage URLs point at the same clip even after a token refresh.
      if (parsed.hostname.endsWith(".supabase.co")) parsed.searchParams.delete("token");
      return `media:${parsed.href}`;
    } catch {
      /* legacy row IDs still provide a stable key */
    }
  }
  return `reel:${reel.id}`;
}
/** Keep the playing item stable; consume it when advancing, never dedupe by row id alone. */
export function unseenReelQueue<T extends QueueReel>(
  items: T[],
  watched: Set<string>,
  activeId: string | null = null,
): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = reelContentKey(item);
    if (seen.has(key) || (watched.has(key) && item.id !== activeId)) return false;
    seen.add(key);
    return true;
  });
}
export function nextReelId<T extends { id: string }>(items: T[], currentId: string): string | null {
  const index = items.findIndex((r) => r.id === currentId);
  return index < 0 ? null : (items[index + 1]?.id ?? null);
}
