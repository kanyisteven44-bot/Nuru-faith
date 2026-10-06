// Expansion requested from the verified baseline: 10,008 songs and 54 music sources.
export const MUSIC_CATALOG_TARGET = 110_008;
export const MUSIC_SOURCE_TARGET = 2_054;
export function catalogueTarget(kind: "music" | "podcast") {
  return kind === "music" ? MUSIC_CATALOG_TARGET : 10_000;
}
