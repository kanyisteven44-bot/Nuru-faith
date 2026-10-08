import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, UserRound } from "lucide-react";
import { toast } from "sonner";
import { fetchYouTubeReelDetails } from "@/lib/youtubeReel.functions";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchExternalReelState,
  toggleExternalReelLike,
} from "@/services/externalReelInteractions";
import { ExternalVideoCommentsSheet } from "@/components/nuru/ExternalVideoCommentsSheet";

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

  const details = useQuery({
    queryKey: ["youtube-reel-details", videoId],
    queryFn: () => fetchYouTubeReelDetails({ data: { videoId } }),
    enabled: !!userId && /^[A-Za-z0-9_-]{11}$/.test(videoId),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

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
      toast.success(currentlyLiked ? "Like removed" : "Liked");
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
  const likeCount = details.data?.stats.likes;
  const commentCount = details.data?.stats.comments;

  function openComments() {
    onPanelOpen();
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
          aria-label={liked ? "Remove like" : "Like video"}
          onClick={() => {
            if (!userId) {
              toast.error("Sign in to like this video");
              return;
            }
            if (!like.isPending) like.mutate(liked);
          }}
        >
          <Heart className={liked ? "h-5 w-5 fill-rose-500 text-rose-500" : "h-5 w-5"} />
          {likeCount != null ? BigInt(likeCount).toLocaleString() : "Like"}
        </button>

        <button
          type="button"
          className="flex min-h-11 items-center gap-2 text-sm"
          onClick={openComments}
          aria-label="Comments"
        >
          <MessageCircle className="h-5 w-5" />
          {commentCount != null ? BigInt(commentCount).toLocaleString() : "Comments"}
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

      {commentsOpen && (
        <ExternalVideoCommentsSheet
          externalId={videoId}
          userId={userId}
          onClose={() => setCommentsOpen(false)}
        />
      )}
    </>
  );
}
