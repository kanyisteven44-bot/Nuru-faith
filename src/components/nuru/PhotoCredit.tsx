import type { PexelsPhoto } from "@/lib/pexels.functions";
import { cn } from "@/lib/utils";

export function PhotoCredit({
  photo,
  className,
}: {
  photo: PexelsPhoto | null;
  className?: string;
}) {
  if (!photo) return null;
  return (
    <a
      href={photo.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "absolute right-2 bottom-2 z-10 rounded-md bg-black/80 px-2 py-1 text-[11px] font-medium text-white underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary",
        className,
      )}
      aria-label={`Photo by ${photo.photographer} on Pexels`}
    >
      Photo: {photo.photographer} · Pexels
    </a>
  );
}
