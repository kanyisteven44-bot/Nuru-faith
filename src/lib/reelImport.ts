/**
 * Parses a pasted third-party video link into the fields Nuru Faith stores
 * for an imported Reel. Nuru Faith never downloads or rehosts the actual
 * video — imported Reels always play back through the platform's own
 * official embed (YouTube) or link out to the original (TikTok, Instagram),
 * and are always saved with rights_status = "external_embed".
 */

export type ImportedSource = "youtube" | "tiktok" | "instagram";

export type DetectedReelSource = {
  sourceType: ImportedSource;
  externalId: string | null;
  externalUrl: string;
  posterUrl: string | null;
};

function normalizeUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

function detectYouTube(url: URL): DetectedReelSource | null {
  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  if (!/(^|\.)youtube\.com$/.test(host) && host !== "youtu.be") return null;

  let videoId: string | null = null;
  if (host === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (url.pathname.startsWith("/shorts/")) {
    videoId = url.pathname.split("/")[2] ?? null;
  } else if (url.pathname === "/watch") {
    videoId = url.searchParams.get("v");
  } else if (url.pathname.startsWith("/embed/")) {
    videoId = url.pathname.split("/")[2] ?? null;
  }
  videoId = videoId?.split("?")[0]?.split("&")[0] ?? null;
  if (!videoId || !/^[\w-]{6,20}$/.test(videoId)) return null;

  return {
    sourceType: "youtube",
    externalId: videoId,
    externalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    posterUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  };
}

function detectTikTok(url: URL): DetectedReelSource | null {
  const host = url.hostname.replace(/^www\./, "");
  if (!/(^|\.)tiktok\.com$/.test(host)) return null;

  const match = /\/video\/(\d+)/.exec(url.pathname);
  return {
    sourceType: "tiktok",
    externalId: match?.[1] ?? null,
    externalUrl: url.toString(),
    posterUrl: null,
  };
}

function detectInstagram(url: URL): DetectedReelSource | null {
  const host = url.hostname.replace(/^www\./, "");
  if (!/(^|\.)instagram\.com$/.test(host)) return null;

  const match = /\/(reel|p|tv)\/([^/?#]+)/.exec(url.pathname);
  if (!match) return null;

  return {
    sourceType: "instagram",
    externalId: match[2] ?? null,
    externalUrl: `https://www.instagram.com/${match[1]}/${match[2]}/`,
    posterUrl: null,
  };
}

/** Returns null when the link isn't a recognized YouTube, TikTok or Instagram video/reel URL. */
export function detectReelSource(input: string): DetectedReelSource | null {
  const url = normalizeUrl(input);
  if (!url) return null;
  return detectYouTube(url) ?? detectTikTok(url) ?? detectInstagram(url);
}

export const SOURCE_LABEL: Record<ImportedSource, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
};
