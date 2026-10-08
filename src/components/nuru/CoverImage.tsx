import { useState, type ImgHTMLAttributes } from "react";
import { FALLBACK_IMAGE } from "@/lib/media";
import { cn } from "@/lib/utils";

/** Content covers keep their source; a failed request falls back to bundled art. */
export function CoverImage({
  src,
  alt,
  className,
  loading = "lazy",
  decoding = "async",
  onError,
  fallbackSrc = FALLBACK_IMAGE,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { alt: string; fallbackSrc?: string }) {
  const [failedSource, setFailedSource] = useState<string | undefined>();
  const source = !src || failedSource === src ? fallbackSrc : src;

  return (
    <img
      {...props}
      src={source}
      srcSet={source === src ? props.srcSet : undefined}
      alt={alt}
      loading={loading}
      decoding={decoding}
      className={cn("bg-surface-2 object-cover object-[50%_45%]", className)}
      onError={(event) => {
        if (source !== fallbackSrc) setFailedSource(src);
        onError?.(event);
      }}
    />
  );
}
