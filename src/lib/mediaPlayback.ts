export function playableAudioUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function youtubeVideoId(value: string): string | null {
  return /^[A-Za-z0-9_-]{11}$/.test(value) ? value : null;
}
