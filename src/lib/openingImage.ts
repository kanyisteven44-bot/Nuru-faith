/** Keep the opening preload and both first-photo layers on the same resource. */
export const OPENING_IMAGE_SRC = "/photos/friends-outdoors-v1-1600.webp";
export const OPENING_IMAGE_SRCSET = "/photos/friends-outdoors-v1-640.webp 640w, /photos/friends-outdoors-v1-1024.webp 1024w, /photos/friends-outdoors-v1-1600.webp 1600w";
// The photograph covers the full viewport, including tall phone screens.
export const OPENING_IMAGE_SIZES = "(max-aspect-ratio: 1600/1067) 150vh, 100vw";
export const OPENING_IMAGE_PRELOAD = {
  rel: "preload", as: "image", href: OPENING_IMAGE_SRC,
  imageSrcSet: OPENING_IMAGE_SRCSET, imageSizes: OPENING_IMAGE_SIZES,
  fetchPriority: "high",
} as const;
