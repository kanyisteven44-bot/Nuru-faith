import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Heart, MessageCircle, UserRound } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchExternalReelState,
  toggleExternalReelLike,
} from "@/services/externalReelInteractions";
import { fetchYouTubeReelDetails } from "@/lib/youtubeReel.functions";
import { ExternalVideoCommentsSheet } from "@/components/nuru/ExternalVideoCommentsSheet";
import { YouTubeReelSheet } from "@/components/nuru/reels/YouTubeReelSheet";
import { compactNumber } from "@/lib/format";

type ExternalState = Awaited<ReturnType<typeof fetchExternalReelState>>;

export function YouTubeSongActions({
  videoId,
  onPanelOpen,
}: {
  videoId: string;
  onPanelOpen: () => void;
}) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [comments, setComments] = useState<"nuru" | "youtube" | null>(null);

  const stateKey = ["external-reel-state", userId, videoId] as const;
  const state = useQuery({
    queryKey: stateKey,
    queryFn: () => fetchExternalReelState(userId!, videoId),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const details = useQuery({
    queryKey: ["youtube-reel-details", videoId],
    queryFn: () => fetchYouTubeReelDetails({ data: { videoId } }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const like = useMutation({
    mutationFn: (currentlyLiked: boolean) => {
      if (!userId) throw new Error("Sign in to like this video");
      return toggleExternalReelLike(userId, videoId, currentlyLiked);
    },
    onMutate: async (currentlyLiked) => {
      await qc.cancelQueries({ queryKey: stateKey });
      const previous = qc.getQueryData<ExternalState>(stateKey) ?? state.data;
      const base =
        previous ??
        ({
          liked: currentlyLiked,
          saved: false,
          commentCount: 0,
          likeCount: 0,
        } satisfies ExternalState);
      const nextLiked = !currentlyLiked;
      qc.setQueryData<ExternalState>(stateKey, {
        ...base,
        liked: nextLiked,
        likeCount: Math.max(0, base.likeCount + (nextLiked ? 1 : -1)),
      });
      return { previous };
    },
    onError: (error, _liked, context) => {
      if (context?.previous) qc.setQueryData(stateKey, context.previous);
      toast.error(error instanceof Error ? error.message : "Couldn't save that like");
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: stateKey });
    },
  });

  function openComments(source: "nuru" | "youtube") {
    onPanelOpen();
    setComments(source);
  }

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-3" aria-label="Video actions">
        <button
          type="button"
          className="flex min-h-11 items-center gap-2 text-sm"
          disabled={like.isPending}
          aria-pressed={!!state.data?.liked}
          aria-label={state.data?.liked ? "Unlike on Nuru" : "Like on Nuru"}
          onClick={() => {
            if (!userId) {
              toast.error("Sign in to like videos");
              return;
            }
            if (!like.isPending) like.mutate(!!state.data?.liked);
          }}
        >
          <Heart
            className={`h-5 w-5 ${state.data?.liked ? "fill-current text-rose-500" : ""}`}
          />
          {state.data?.likeCount ? compactNumber(state.data.likeCount) : "Like"}
        </button>

        <button
          type="button"
          className="flex min-h-11 items-center gap-2 text-sm"
          onClick={() => openComments("nuru")}
          aria-label="Nuru comments"
        >
          <MessageCircle className="h-5 w-5" />
          {state.data?.commentCount ? compactNumber(state.data.commentCount) : "Comments"}
        </button>

        <button
          type="button"
          className="flex min-h-11 items-center gap-2 text-sm"
          onClick={() => {
            onPanelOpen();
            void navigate({
              to: "/creator/$videoId",
              params: { videoId },
              search: { from: "music" },
            });
          }}
        >
          <UserRound className="h-5 w-5" />
          Creator
        </button>

        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground"
        >
          <ExternalLink className="h-4.5 w-4.5" />
          YouTube
        </a>
      </div>

      <p className="mt-2 text-center text-[10px] leading-4 text-muted-foreground">
        Likes and comments here are saved in Nuru. Open YouTube for source-platform interactions.
      </p>

      {comments === "nuru" && (
        <ExternalVideoCommentsSheet
          externalId={videoId}
          userId={userId}
          onOpenSourceComments={() => setComments("youtube")}
          onClose={() => setComments(null)}
        />
      )}

      {comments === "youtube" && (
        <YouTubeReelSheet
          videoId={videoId}
          section="comments"
          returnTo="/music"
          onNuruComments={() => setComments("nuru")}
          onClose={() => setComments(null)}
        />
      )}

      {details.data?.stats.likes != null && (
        <span className="sr-only">
          YouTube reports {Number(details.data.stats.likes).toLocaleString()} source-platform likes.
        </span>
      )}
    </>
  );
}
