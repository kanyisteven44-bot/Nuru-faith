/** Feed chips map to persisted post kinds; News is stored as announcement. */
export const COMMUNITY_KIND_FOR_TAB = {
  Prayer: "prayer",
  Testimony: "testimony",
  News: "announcement",
} as const;
export type CommunityPostKind =
  (typeof COMMUNITY_KIND_FOR_TAB)[keyof typeof COMMUNITY_KIND_FOR_TAB];
