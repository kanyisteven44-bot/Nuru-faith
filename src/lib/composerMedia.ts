const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
export function validateComposerMedia(
  file: Pick<File, "type" | "size">,
  reel = false,
): string | null {
  if (!VIDEO_TYPES.has(file.type) && (reel || !IMAGE_TYPES.has(file.type)))
    return reel
      ? "Choose an MP4, WebM or MOV video for your reel."
      : "Choose a JPG, PNG, WebP, GIF, MP4, WebM or MOV.";
  if (file.size === 0) return "This file is empty. Choose another file.";
  if (file.size > 50 * 1024 * 1024) return "Choose a file smaller than 50 MB.";
  return null;
}
export function formatMediaSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
