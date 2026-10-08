/** Mix a page without changing the order of pages already on screen. */
export function rotateMusicPage<T extends { id: string }>(
  items: readonly T[],
  refresh: number,
): T[] {
  const hash = (id: string) => {
    let value = 2166136261;
    for (const char of id) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
    return value >>> 0;
  };
  const mixed = [...items].sort((a, b) => hash(a.id) - hash(b.id) || a.id.localeCompare(b.id));
  if (mixed.length < 2) return mixed;
  const offset = ((refresh % mixed.length) + mixed.length) % mixed.length;
  return [...mixed.slice(offset), ...mixed.slice(0, offset)];
}

/** Persist only an ordering counter; no songs or user information. */
export function nextMusicRefresh(storage: Pick<Storage, "getItem" | "setItem"> | null): number {
  if (!storage) return Date.now();
  try {
    const previous = Number(storage?.getItem("nuru:music-order:v1") ?? "0");
    const next = Number.isSafeInteger(previous) && previous >= 0 ? previous + 1 : 1;
    storage?.setItem("nuru:music-order:v1", String(next));
    return next;
  } catch {
    return Date.now();
  }
}
