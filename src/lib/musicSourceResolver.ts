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
