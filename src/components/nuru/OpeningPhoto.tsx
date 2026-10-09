import type { ImgHTMLAttributes } from "react";
import { OPENING_IMAGE_SRC, OPENING_IMAGE_SRCSET, OPENING_IMAGE_SIZES, OPENING_PORTRAIT_MEDIA, OPENING_PORTRAIT_SRC } from "@/lib/openingImage";

/** The portrait removes only pixels already outside a tall phone's cover crop. */
export function OpeningPhoto(props: Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "sizes" | "alt">) {
  return (
    <picture>
      <source media={OPENING_PORTRAIT_MEDIA} srcSet={OPENING_PORTRAIT_SRC} type="image/webp" />
      <img {...props} src={OPENING_IMAGE_SRC} srcSet={OPENING_IMAGE_SRCSET}
        sizes={OPENING_IMAGE_SIZES} alt="" decoding="async" fetchPriority="high" />
    </picture>
  );
}
