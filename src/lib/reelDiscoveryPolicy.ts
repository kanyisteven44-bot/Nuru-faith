const CHRISTIAN_TERMS = [
  "bible",
  "biblical",
  "jesus",
  "christ",
  "christian",
  "gospel",
  "prayer",
  "scripture",
  "worship",
  "faith",
  "devotional",
  "testimony",
  "church",
  "holy spirit",
  "sermon",
  "god",
];

const DISCOVERY_BLOCK_TERMS = [
  "porn",
  "sexual",
  "explicit",
  "gambling",
  "casino",
  "prank",
  "horror",
  "gossip",
  "celebrity drama",
  "political campaign",
];

/** Conservative second gate after YouTube safeSearch=strict. */
export function isChristianDiscoveryCandidate(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  if (DISCOVERY_BLOCK_TERMS.some((term) => text.includes(term))) return false;
  return CHRISTIAN_TERMS.some((term) => text.includes(term));
}
