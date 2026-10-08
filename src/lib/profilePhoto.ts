export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function profilePhotoExtension(file: { type: string; size: number }): string {
  const extension = PHOTO_TYPES[file.type];
  if (!extension) throw new Error("Choose a JPG, PNG or WebP photo.");
  if (!file.size || file.size > PROFILE_PHOTO_MAX_BYTES)
    throw new Error("Choose a photo smaller than 5 MB.");
  return extension;
}

/** Avatars never render larger than ~104 CSS px, so 512 px covers 3x screens. */
const PROFILE_PHOTO_EDGE = 512;

/**
 * Downscale a chosen photo to a small WebP before upload. Phone photos are
 * often several MB, and every avatar on every screen would otherwise download
 * the full original. Falls back to the original file wherever the browser
 * can't decode or encode it, so an upload is never blocked by this step.
 */
export async function shrinkProfilePhoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, PROFILE_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85),
    );
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}
