import { trustedChannel } from "./content-policy.ts";
/** Preserve existing reviewed music sources and their language/curation metadata. */
export function reviewedSingerIds(
  sources: {
    youtube_channel_id: string | null;
    is_approved: boolean;
    is_verified: boolean;
    content_kind: string;
  }[],
  channels: { channel_id: string; is_verified: boolean; trust_level: string | null }[],
) {
  const trusted = new Set(
    channels
      .filter((row) => row.is_verified && trustedChannel(row.trust_level))
      .map((row) => row.channel_id),
  );
  return new Set(
    sources
      .filter(
        (row) =>
          row.youtube_channel_id &&
          row.is_approved &&
          row.is_verified &&
          ["music", "mixed"].includes(row.content_kind) &&
          trusted.has(row.youtube_channel_id),
      )
      .map((row) => row.youtube_channel_id!),
  );
}
