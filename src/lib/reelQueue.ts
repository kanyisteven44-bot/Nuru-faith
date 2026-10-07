type QueueReel = { id: string; source_type: string; external_id: string | null };
export function reelContentKey(reel: QueueReel): string {
  return reel.source_type === "youtube" && reel.external_id ? reel.external_id : `reel:${reel.id}`;
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
