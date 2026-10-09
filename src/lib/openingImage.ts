/** Keep the opening preload and both first-photo layers on the same resource. */
export const OPENING_IMAGE_SRC = "/photos/friends-outdoors-v1-1600.webp";
export const OPENING_IMAGE_SRCSET = "/photos/friends-outdoors-v1-640.webp 640w, /photos/friends-outdoors-v1-1024.webp 1024w, /photos/friends-outdoors-v1-1600.webp 1600w";
// The photograph covers the full viewport, including tall phone screens.
export const OPENING_IMAGE_SIZES = "(max-aspect-ratio: 1600/1067) 150vh, 100vw";
export const OPENING_PORTRAIT_SRC = "/photos/friends-outdoors-portrait-v1.webp";
export const OPENING_PORTRAIT_MEDIA = "(max-width: 640px) and (max-aspect-ratio: 800/1067)";
export const OPENING_IMAGE_PRELOADS = [{
  rel: "preload", as: "image", href: OPENING_PORTRAIT_SRC,
  type: "image/webp", media: OPENING_PORTRAIT_MEDIA, fetchPriority: "high",
}, {
  rel: "preload", as: "image", href: OPENING_IMAGE_SRC,
  imageSrcSet: OPENING_IMAGE_SRCSET, imageSizes: OPENING_IMAGE_SIZES,
  // `not` negates the complete query, exactly complementing the portrait source.
  media: "not all and " + OPENING_PORTRAIT_MEDIA,
  fetchPriority: "high",
}] as const;
