/**
 * Turning a list of artist names into reviewed media_sources rows.
 *
 * The catalogue importer pulls songs from whatever channels sit in
 * media_sources, so a wrong channel id means the app serves the wrong
 * channel's uploads to young people as worship music. Everything here is
 * therefore built to refuse rather than guess: a candidate that does not
 * clearly match a real, active music channel comes back unresolved, and the
 * operator reviews it by hand.
 *
 * Pure functions only — the network lives in scripts/resolve-music-sources.mjs
 * so the decisions can be tested without a key.
 */

export type CandidateArtist = {
  /** The name to search for, as the artist is normally written. */
  name: string;
  /** ISO 639 codes this artist records in, most prominent first. */
  languages: string[];
  /** Optional @handle, which resolves far more reliably than a name. */
  handle?: string;
  /** Why this name is on the list — a source URL or a short note. */
  note?: string;
};

export type ChannelSummary = {
  channelId: string;
  title: string;
  description?: string;
  avatarUrl?: string | null;
  customUrl?: string | null;
  subscriberCount?: number;
  videoCount?: number;
};

export type ReviewedSource = {
  name: string;
  youtube_channel_id: string;
  content_kind: "music";
  language_codes: string[];
  avatar_url: string | null;
  verification_url: string;
  verified_at: string;
  sample_title: string;
  sample_video_id: string;
};

/** Lowercase, strip punctuation and the noise words channels add to titles. */
export function normaliseName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\b(official|offical|music|tv|channel|vevo|ministries|ministry|hsc|kenya)\b/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(value: string): string[] {
  return normaliseName(value).split(" ").filter(Boolean);
}

/**
 * How confidently `channel` is the artist `candidate` names, from 0 to 1.
 *
 * Name similarity only — popularity is deliberately not a factor, because a
 * big channel with a loosely similar name is exactly the wrong answer.
 */
export function scoreChannelMatch(candidate: string, channel: ChannelSummary): number {
  const wanted = tokens(candidate);
  const got = tokens(channel.title);
  if (!wanted.length || !got.length) return 0;

  const wantedKey = wanted.join(" ");
  const gotKey = got.join(" ");
  if (wantedKey === gotKey) return 1;

  // A one-word name is only ever safe as an exact match, handled above.
  // Scoring it on overlap would latch "Grace" onto "Grace Community Church",
  // or "Bahati" onto "Bahati Bukuku" — a different artist entirely.
  if (wanted.length === 1) return 0;

  const overlap = wanted.filter((t) => got.includes(t)).length;
  const coverage = overlap / wanted.length;
  // Every word of the artist's name appears in the channel title.
  if (coverage === 1)
    return gotKey.startsWith(wantedKey) || gotKey.endsWith(wantedKey) ? 0.95 : 0.85;
  return coverage >= 0.5 ? coverage * 0.7 : 0;
}

/** The score a match must clear before it is written down as verified. */
export const MATCH_THRESHOLD = 0.85;

export type PickResult =
  | { ok: true; channel: ChannelSummary; score: number }
  | { ok: false; reason: string; best?: { title: string; score: number } };

/**
 * The best channel for a candidate, or why none was accepted. An ambiguous
 * field — two channels scoring alike — is refused rather than guessed at.
 */
export function pickBestChannel(candidate: string, channels: ChannelSummary[]): PickResult {
  if (!channels.length) return { ok: false, reason: "no search results" };

  const ranked = channels
    .map((channel) => ({ channel, score: scoreChannelMatch(candidate, channel) }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0]!;
  if (top.score < MATCH_THRESHOLD) {
    return {
      ok: false,
      reason: `best match scored ${top.score.toFixed(2)}, below ${MATCH_THRESHOLD}`,
      best: { title: top.channel.title, score: top.score },
    };
  }

  const runnerUp = ranked[1];
  if (runnerUp && top.score - runnerUp.score < 0.1) {
    return {
      ok: false,
      reason: `ambiguous: "${top.channel.title}" and "${runnerUp.channel.title}" score alike`,
      best: { title: top.channel.title, score: top.score },
    };
  }

  return { ok: true, channel: top.channel, score: top.score };
}

/** A channel has to actually be publishing music before it joins the catalogue. */
export const MIN_ELIGIBLE_SONGS = 3;

export function qualifiesAsMusicSource(eligibleSongCount: number): boolean {
  return eligibleSongCount >= MIN_ELIGIBLE_SONGS;
}

/**
 * Candidates that are already covered, by channel id or by normalised name,
 * so a re-run never adds a second row for an artist already reviewed.
 */
export function partitionAgainstExisting<T extends { name: string }>(
  candidates: T[],
  existing: { name: string; youtube_channel_id: string }[],
): { fresh: T[]; alreadyKnown: T[] } {
  const knownNames = new Set(existing.map((e) => normaliseName(e.name)));
  const fresh: T[] = [];
  const alreadyKnown: T[] = [];
  for (const candidate of candidates) {
    (knownNames.has(normaliseName(candidate.name)) ? alreadyKnown : fresh).push(candidate);
  }
  return { fresh, alreadyKnown };
}

export function isKnownChannel(
  channelId: string,
  existing: { youtube_channel_id: string }[],
): boolean {
  return existing.some((e) => e.youtube_channel_id === channelId);
}

/* ---------- bulk discovery ---------- */

/**
 * Words that mark a channel as gospel rather than general music.
 *
 * Discovery searches gospel terms, but YouTube happily returns secular
 * channels for them, so a discovered channel must say for itself that it is
 * Christian music before it can be approved without a person looking. Named
 * candidates skip this check — a person already vouched for the name.
 */
const FAITH_WORDS = [
  "gospel",
  "worship",
  "praise",
  "gospel music",
  "christian",
  "gospel singer",
  "minister",
  "ministries",
  "ministry",
  "church",
  "jesus",
  "christ",
  "gospel artist",
  "hymn",
  "injili", // Kiswahili: gospel
  "sifa", // Kiswahili: praise
  "kwaya", // Kiswahili: choir
  "nyimbo za injili",
  "ibada", // Kiswahili: worship
  "bwana", // Kiswahili: Lord
  "mungu", // Kiswahili: God
  "yesu",
  "ngai", // Kikuyu: God
  "nyasaye", // Dholuo: God
  "mwathani", // Kikuyu: Lord
  "asis", // Kalenjin: God
  "enkai", // Maa: God
  "akuj", // Turkana: God
  "mulungu",
  "murungu",
];

/** Words that mark a channel as something this catalogue must not import. */
const DISQUALIFYING_WORDS = [
  "dj ",
  "mixtape",
  "mix vol",
  "nonstop mix",
  "secular",
  "comedy",
  "news",
  "politics",
  "movie",
  "film",
  "drama",
  "trailer",
];

function hasWord(haystack: string, needle: string): boolean {
  return new RegExp(`(^|\\W)${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\W|$)`, "i").test(
    haystack,
  );
}

/**
 * Search terms that find gospel channels per language. Discovery runs every
 * one of these, so the catalogue grows without anybody writing a name list.
 * Each costs 100 quota units, so the set is deliberately finite.
 */
export const DISCOVERY_QUERIES: { query: string; languages: string[] }[] = [
  // Kiswahili / East Africa
  { query: "nyimbo za injili", languages: ["sw"] },
  { query: "swahili gospel music official", languages: ["sw"] },
  { query: "swahili worship songs", languages: ["sw"] },
  { query: "kenyan gospel artist official", languages: ["sw"] },
  { query: "tanzania gospel music official", languages: ["sw"] },
  { query: "praise and worship kenya", languages: ["sw", "en"] },
  // Kikuyu
  { query: "kikuyu gospel songs official", languages: ["ki"] },
  { query: "kikuyu worship music", languages: ["ki"] },
  { query: "nyimbo cia gukena ngai", languages: ["ki"] },
  // Dholuo
  { query: "luo gospel songs official", languages: ["luo"] },
  { query: "dholuo worship music", languages: ["luo"] },
  // Kalenjin
  { query: "kalenjin gospel songs official", languages: ["kln"] },
  { query: "kalenjin worship music", languages: ["kln"] },
  // Kamba
  { query: "kamba gospel songs official", languages: ["kam"] },
  { query: "kikamba gospel music", languages: ["kam"] },
  // Luhya
  { query: "luhya gospel songs official", languages: ["luy"] },
  { query: "bukusu gospel music", languages: ["luy"] },
  // Ekegusii
  { query: "kisii gospel songs official", languages: ["guz"] },
  { query: "ekegusii gospel music", languages: ["guz"] },
  // Meru
  { query: "kimeru gospel songs official", languages: ["mer"] },
  // Maa
  { query: "maasai gospel songs official", languages: ["mas"] },
  // Turkana
  { query: "turkana gospel songs official", languages: ["tuv"] },
  // Taita
  { query: "taita gospel songs official", languages: ["dav"] },
  // English, African worship
  { query: "african gospel worship official", languages: ["en"] },
  { query: "gospel worship official channel", languages: ["en"] },
];

export type FaithSignal = { gospel: boolean; disqualified: string | null };

/**
 * Whether a channel's own title and description say it is gospel music.
 * Returns the disqualifying word when one is found, so the report can say why.
 */
export function faithSignal(channel: ChannelSummary): FaithSignal {
  const text = `${channel.title} ${channel.description ?? ""}`.toLowerCase();
  const blocked = DISQUALIFYING_WORDS.find((word) =>
    word.endsWith(" ") ? text.includes(word) : hasWord(text, word),
  );
  if (blocked) return { gospel: false, disqualified: blocked.trim() };
  return { gospel: FAITH_WORDS.some((word) => hasWord(text, word)), disqualified: null };
}

/**
 * Whether a channel found by search — rather than by name — may be approved
 * without a person reviewing it. Stricter than the named path on purpose.
 */
export function autoApprovable(channel: ChannelSummary, eligibleSongCount: number): boolean {
  return qualifiesAsMusicSource(eligibleSongCount) && faithSignal(channel).gospel;
}

/** Shape the verified result exactly as content/media-source-review.json stores it. */
export function toReviewedSource(input: {
  channel: ChannelSummary;
  languages: string[];
  sample: { id: string; title: string };
  verifiedAt: string;
}): ReviewedSource {
  return {
    name: input.channel.title,
    youtube_channel_id: input.channel.channelId,
    content_kind: "music",
    language_codes: input.languages,
    avatar_url: input.channel.avatarUrl ?? null,
    verification_url: `https://www.youtube.com/channel/${input.channel.channelId}`,
    verified_at: input.verifiedAt,
    sample_title: input.sample.title,
    sample_video_id: input.sample.id,
  };
}
