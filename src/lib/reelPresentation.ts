type DiscoveryReel = {
  creator_name: string;
  title?: string | null;
  caption?: string | null;
  source_type: string;
  external_id: string | null;
  external_url?: string | null;
  video_url?: string | null;
};

/** Only explicit fixtures are hidden; normal testimony and teaching titles remain eligible. */
export function isPresentableReel(reel: DiscoveryReel): boolean {
  if (/^nuru test content(?:\s|$)/i.test(reel.creator_name.trim())) return false;
  if (/^\[test reel\b/i.test((reel.caption ?? reel.title ?? "").trim())) return false;
  if (reel.source_type === "youtube") return /^[A-Za-z0-9_-]{11}$/.test(reel.external_id ?? "");
  return Boolean(reel.video_url || reel.external_url);
}

/** Round-robin creators within the current discovery window, preserving each creator's order. */
export function diversifyReels<T extends { creator_name: string }>(items: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.creator_name.trim().toLowerCase();
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  const result: T[] = [];
  let offset = 0;
  let added = true;
  while (added) {
    added = false;
    for (const group of groups.values()) {
      const item = group[offset];
      if (item) {
        result.push(item);
        added = true;
      }
    }
    offset++;
  }
  return result;
}
