import { useQuery } from "@tanstack/react-query";
import { DEFAULT_TRANSLATION, fetchPassage } from "@/lib/bible";
import { cn } from "@/lib/utils";

/** Renders the real text of a Bible reference, fetched from a public Bible API. */
export function ScriptureText({
  reference,
  className,
  showTranslation = true,
  clamp,
  translation = DEFAULT_TRANSLATION,
}: {
  reference: string;
  className?: string;
  showTranslation?: boolean;
  clamp?: boolean;
  /** Which bible-api translation to read. Falls back to WEB if unavailable. */
  translation?: string;
}) {
  const passage = useQuery({
    queryKey: ["passage", reference, translation],
    queryFn: () => fetchPassage(reference, translation),
    staleTime: Infinity,
    retry: 1,
  });

  if (passage.isLoading)
    return (
      <span
        className="mt-1 block h-4 w-3/4 animate-pulse rounded bg-surface-2"
        aria-label="Loading Scripture"
      />
    );

  if (passage.isError || !passage.data)
    return (
      <span className="text-xs text-muted-foreground">
        Scripture couldn't load — check your connection.
      </span>
    );

  return (
    <span className={cn("block", className)}>
      <span className={cn("block italic", clamp && "line-clamp-4")}>"{passage.data.text}"</span>
      {showTranslation && (
        <span className="mt-1 block text-[11px] not-italic text-muted-foreground">
          {passage.data.reference} · {passage.data.translation}
        </span>
      )}
    </span>
  );
}
