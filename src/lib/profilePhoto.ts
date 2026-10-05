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
