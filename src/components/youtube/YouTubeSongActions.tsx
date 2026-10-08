import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, UserRound } from "lucide-react";
import { toast } from "sonner";
import { VideoSourceStats } from "./VideoSourceStats";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchExternalReelState,
  toggleExternalReelLike,
} from "@/services/externalReelInteractions";
import { ExternalVideoCommentsSheet } from "@/components/nuru/ExternalVideoCommentsSheet";
import { YouTubeReelSheet } from "@/components/nuru/reels/YouTubeReelSheet";

type ExternalState = Awaited<ReturnType<typeof fetchExternalReelState>>;

export function YouTubeSongActions({
  videoId,
  onPanelOpen,
}: {
  videoId: string;
  onPanelOpen: () => void;
}) {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentSource, setCommentSource] = useState<"nuru" | "youtube">("nuru");

  const stateKey = ["external-reel-state", userId, videoId] as const;
  const state = useQuery({
    queryKey: stateKey,
    queryFn: () => fetchExternalReelState(userId!, videoId),
    enabled: !!userId,
    staleTime: 30_000,
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
    onSuccess: (_nextLiked, currentlyLiked) => {
      toast.success(currentlyLiked ? "Nuru like removed" : "Liked on Nuru");
    },
    onError: (error, _currentlyLiked, context) => {
      if (context?.previous) qc.setQueryData(stateKey, context.previous);
      toast.error(error instanceof Error ? error.message : "Couldn't update your like");
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: stateKey });
    },
  });

  const liked = !!state.data?.liked;
  const likeCount = state.data?.likeCount ?? 0;
  const commentCount = state.data?.commentCount ?? 0;

  function openComments() {
    onPanelOpen();
    setCommentSource("nuru");
    setCommentsOpen(true);
  }

  function openCreator() {
    onPanelOpen();
    void navigate({
      to: "/creator/$videoId",
      params: { videoId },
      search: { from: "music" },
    });
  }

  return (
    <>
      <div className="mt-5 flex items-center justify-center gap-5" aria-label="Video actions">
        <button
          type="button"
          className="flex min-h-11 items-center gap-2 text-sm"
          disabled={like.isPending}
          aria-pressed={liked}
          aria-label={liked ? "Remove Nuru like" : "Like on Nuru"}
          onClick={() => {
            if (!userId) {
              toast.error("Sign in to like this video");
              return;
            }
            if (!like.isPending) like.mutate(liked);
          }}
        >
          <Heart className={liked ? "h-5 w-5 fill-rose-500 text-rose-500" : "h-5 w-5"} />
          {likeCount > 0 ? likeCount.toLocaleString() : "Like"}{" "}
          <span className="text-[10px] text-muted-foreground">in Nuru</span>
        </button>

        <button
          type="button"
          className="flex min-h-11 items-center gap-2 text-sm"
          onClick={openComments}
          aria-label="Nuru comments"
        >
          <MessageCircle className="h-5 w-5" />
          {commentCount > 0 ? commentCount.toLocaleString() : "Comments"}
        </button>

        <button
          type="button"
          className="flex min-h-11 items-center gap-2 text-sm"
          onClick={openCreator}
          aria-label="Open creator profile"
        >
          <UserRound className="h-5 w-5" />
          Creator
        </button>
      </div>

      <VideoSourceStats videoId={videoId} enabled={!!userId} />

      {commentsOpen && commentSource === "nuru" && (
        <ExternalVideoCommentsSheet
          externalId={videoId}
          userId={userId}
          onOpenSourceComments={() => setCommentSource("youtube")}
          onClose={() => setCommentsOpen(false)}
        />
      )}

      {commentsOpen && commentSource === "youtube" && (
        <YouTubeReelSheet
          videoId={videoId}
          section="comments"
          returnTo="/music"
          onNuruComments={() => setCommentSource("nuru")}
          onClose={() => setCommentsOpen(false)}
        />
      )}
    </>
  );
}
