import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fetchPassage, type Passage } from "@/lib/bible";
import { useQuery } from "@tanstack/react-query";
import { reportReel, REPORT_REASONS, type Reel } from "@/services/reels";
import { reportExternalReel } from "@/services/externalReelInteractions";
import { CardSkeleton, ErrorState } from "@/components/nuru/Primitives";
import { Sheet } from "./Sheet";

export function ReadSheet({ reel, onClose }: { reel: Reel; onClose: () => void }) {
  const passage = useQuery({
    queryKey: ["passage", reel.scripture_ref],
    queryFn: () => fetchPassage(reel.scripture_ref!),
    enabled: !!reel.scripture_ref,
    staleTime: Infinity,
  });
  const data = passage.data as Passage | undefined;

  return (
    <Sheet
      label="Read passage"
      onClose={onClose}
      height="max-h-[75dvh]"
      title={
        <p className="text-[11px] font-semibold uppercase tracking-widest text-cyan">
          {reel.scripture_ref}
        </p>
      }
    >
      <div className="px-4 pb-6">
        {passage.isLoading && <CardSkeleton count={1} height="h-24" />}
        {passage.isError && <ErrorState onRetry={() => void passage.refetch()} />}
        {data && (
          <>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-secondary-foreground">
              {data.text}
            </p>
            <p className="mt-3 text-[11px] text-muted-foreground">
              {data.reference} · {data.translation}
            </p>
          </>
        )}
        {reel.series_id && (
          <Link
            to="/series"
            className="mt-4 flex items-center justify-between rounded-2xl bg-surface-2 p-3 text-sm font-semibold"
          >
            Study this deeper in a Scripture Series
            <span className="text-cyan">Open</span>
          </Link>
        )}
      </div>
    </Sheet>
  );
}

export function ReportSheet({
  reel,
  userId,
  onClose,
}: {
  reel: Reel;
  userId: string | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!userId) {
      toast.error("Sign in first");
      return;
    }
    setSending(true);
    try {
      if (reel.external_id) {
        await reportExternalReel({
          userId,
          externalReelId: reel.external_id,
          reason,
          details,
          sourceUrl: reel.external_url,
          creatorName: reel.creator_name,
        });
      } else {
        await reportReel({ reelId: reel.id, userId, reason, details });
      }
      toast.success("Thank you — our moderators will review this");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send that");
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet
      label="Report reel"
      onClose={onClose}
      height="max-h-[75dvh]"
      title={<h2 className="font-display text-base font-semibold">Report this Reel</h2>}
    >
      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p className="text-xs text-muted-foreground">
          Reports are private. Content that puts anyone at risk is removed quickly.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {REPORT_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium",
                reason === r
                  ? "nuru-gradient-bg text-primary-foreground"
                  : "bg-surface-2 text-secondary-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Anything else we should know? (optional)"
          className="input-nuru mt-3 w-full"
          aria-label="Report details"
        />
        <button
          onClick={submit}
          disabled={sending}
          className="mt-3 min-h-11 w-full rounded-2xl nuru-gradient-bg text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send report"}
        </button>
      </div>
    </Sheet>
  );
}
