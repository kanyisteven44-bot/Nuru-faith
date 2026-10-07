export type YouTubeCreatorReference =
  | { kind: "channel"; id: string }
  | { kind: "handle"; handle: string }
  | { kind: "username"; username: string }
  | { kind: "video"; id: string };

const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeCreatorReference(raw: string): YouTubeCreatorReference | null {
  const value = raw.trim();
  if (!value) return null;

  if (CHANNEL_ID.test(value)) return { kind: "channel", id: value };
  if (VIDEO_ID.test(value)) return { kind: "video", id: value };
  if (value.startsWith("@") && value.length > 1) {
    return { kind: "handle", handle: value.slice(1) };
  }

  let url: URL;
  try {
    url = new URL(value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const allowedHost =
    host === "youtu.be" ||
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com";
  if (!allowedHost) return null;

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return VIDEO_ID.test(id) ? { kind: "video", id } : null;
  }

  const videoId = url.searchParams.get("v");
  if (videoId && VIDEO_ID.test(videoId)) return { kind: "video", id: videoId };

  const parts = url.pathname.split("/").filter(Boolean);
  if (!parts.length) return null;

  if (parts[0] === "channel" && parts[1] && CHANNEL_ID.test(parts[1])) {
    return { kind: "channel", id: parts[1] };
  }
  if (parts[0].startsWith("@") && parts[0].length > 1) {
    return { kind: "handle", handle: decodeURIComponent(parts[0].slice(1)) };
  }
  if (parts[0] === "user" && parts[1]) {
    return { kind: "username", username: decodeURIComponent(parts[1]) };
  }
  if (["shorts", "embed", "live"].includes(parts[0]) && parts[1] && VIDEO_ID.test(parts[1])) {
    return { kind: "video", id: parts[1] };
  }

  return null;
}
