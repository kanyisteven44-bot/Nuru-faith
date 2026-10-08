import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useShareSheet } from "@/hooks/useShareSheet";
import type { Reel } from "@/services/reels";
import {
  fetchExternalReelState,
  toggleExternalReelLike,
  toggleExternalReelSave,
} from "@/services/externalReelInteractions";
import { fetchYouTubeReelDetails } from "@/lib/youtubeReel.functions";
import { ExternalVideoCommentsSheet } from "@/components/nuru/ExternalVideoCommentsSheet";
import { ReelActions } from "./ReelActions";

type ExternalReelState = Awaited<ReturnType<typeof fetchExternalReelState>>;

export function ReelInteractiveActions({
  horizontal = false,
  reel,
  near,
  liked,
  saved,
  onProfile,
  onLike,
  onComments,
  onShare,
  onSave,
  onMore,
  onCommentsVisibilityChange,
}: {
  horizontal?: boolean;
  reel: Reel;
  near: boolean;
  liked: boolean;
  saved: boolean;
  onProfile: () => void;
  onLike: () => void;
  onComments: () => void;
  onShare: () => void;
  onSave: () => void;
  onMore: () => void;
  onCommentsVisibilityChange?: (open: boolean) => void;
}) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const shareSheet = useShareSheet();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const isExternal = reel.source_type === "youtube" && !!reel.external_id;
  const externalId = reel.external_id ?? "";

  const details = useQuery({
    queryKey: ["youtube-reel-details", externalId],
    queryFn: () => fetchYouTubeReelDetails({ data: { videoId: externalId } }),
    enabled: isExternal && near,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const stateKey = ["external-reel-state", userId, externalId] as const;
  const state = useQuery({
    queryKey: stateKey,
    queryFn: () => fetchExternalReelState(userId!, externalId),
    enabled: isExternal && !!userId && near,
    staleTime: 30_000,
  });

  useEffect(() => () => onCommentsVisibilityChange?.(false), [onCommentsVisibilityChange]);

  const likeExternal = useMutation({
    mutationFn: (currentlyLiked: boolean) => {
      if (!userId) throw new Error("Sign in to like Reels");
      return toggleExternalReelLike(userId, externalId, currentlyLiked);
    },
    onMutate: async (currentlyLiked) => {
      await qc.cancelQueries({ queryKey: stateKey });
      const previous = qc.getQueryData<ExternalReelState>(stateKey) ?? state.data;
      const base =
        previous ??
        ({
          liked: currentlyLiked,
          saved: false,
          commentCount: 0,
          likeCount: 0,
        } satisfies ExternalReelState);
      const nextLiked = !currentlyLiked;
      qc.setQueryData<ExternalReelState>(stateKey, {
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

  useEffect(() => {
    const handle = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== externalId) return;
      if (!userId || state.data?.liked || likeExternal.isPending) return;
      likeExternal.mutate(false);
    };
    window.addEventListener("nuru:external-like", handle);
    return () => window.removeEventListener("nuru:external-like", handle);
  }, [externalId, userId, state.data?.liked, likeExternal.isPending]);

  const saveExternal = useMutation({
    mutationFn: (currentlySaved: boolean) => {
      if (!userId) throw new Error("Sign in to save Reels");
      return toggleExternalReelSave(userId, externalId, currentlySaved);
    },
    onMutate: async (currentlySaved) => {
      await qc.cancelQueries({ queryKey: stateKey });
      const previous = qc.getQueryData<ExternalReelState>(stateKey) ?? state.data;
      const base =
        previous ??
        ({
          liked: false,
          saved: currentlySaved,
          commentCount: 0,
          likeCount: 0,
        } satisfies ExternalReelState);
      qc.setQueryData<ExternalReelState>(stateKey, { ...base, saved: !currentlySaved });
      return { previous };
    },
    onSuccess: (_data, currentlySaved) => {
      toast.success(currentlySaved ? "Removed from saved" : "Saved");
    },
    onError: (error, _saved, context) => {
      if (context?.previous) qc.setQueryData(stateKey, context.previous);
      toast.error(error instanceof Error ? error.message : "Couldn't save Reel");
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: stateKey });
    },
  });

  function shareExternal() {
    const url = reel.external_url ?? `https://www.youtube.com/watch?v=${externalId}`;
    void shareSheet.share({
      title: reel.title ?? "Nuru Faith Reel",
      text: reel.caption ?? "",
      url,
    });
  }

  return (
    <>
      <ReelActions
        horizontal={horizontal}
        youtubeStats={
          isExternal ? (details.data?.stats ?? { likes: null, comments: null }) : undefined
        }
        avatarUrl={details.data?.creator.avatar ?? reel.creator_avatar_url}
        creatorName={reel.creator_name}
        likeCount={isExternal ? (state.data?.likeCount ?? 0) : reel.like_count}
        commentCount={isExternal ? (state.data?.commentCount ?? 0) : reel.comment_count}
        liked={isExternal ? !!state.data?.liked : liked}
        saved={isExternal ? !!state.data?.saved : saved}
        onProfile={onProfile}
        onLike={() => {
          if (!isExternal) return onLike();
          if (!userId) return toast.error("Sign in to like Reels");
          if (!likeExternal.isPending) likeExternal.mutate(!!state.data?.liked);
        }}
        onComments={() => {
          if (!isExternal) return onComments();
          setCommentsOpen(true);
          onCommentsVisibilityChange?.(true);
        }}
        onShare={() => {
          if (!isExternal) return onShare();
          shareExternal();
        }}
        onSave={() => {
          if (!isExternal) return onSave();
          if (!userId) return toast.error("Sign in to save Reels");
          if (!saveExternal.isPending) saveExternal.mutate(!!state.data?.saved);
        }}
        onMore={onMore}
      />

      {isExternal && commentsOpen && (
        <ExternalVideoCommentsSheet
          externalId={externalId}
          userId={userId}
          onClose={() => {
            setCommentsOpen(false);
            onCommentsVisibilityChange?.(false);
          }}
        />
      )}

      {shareSheet.node}
    </>
  );
}
