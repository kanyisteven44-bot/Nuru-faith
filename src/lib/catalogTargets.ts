// Catalogue-size benchmarks for admin progress. Music imports continue past the
// song benchmark until every verified/approved artist source has been scanned.
export const MUSIC_CATALOG_TARGET = 110_008;
export const MUSIC_SOURCE_TARGET = 5_000;

export function catalogueTarget(kind: "music" | "podcast") {
  return kind === "music" ? MUSIC_CATALOG_TARGET : 10_000;
}
