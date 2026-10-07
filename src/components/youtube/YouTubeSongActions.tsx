import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  getYouTubeRating,
  setYouTubeRating,
  connectYouTube,
  YouTubeConnectionRequired,
} from "@/services/youtubeRatings";
import { fetchYouTubeReelDetails } from "@/lib/youtubeReel.functions";
import { YouTubeReelSheet } from "@/components/nuru/reels/YouTubeReelSheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function YouTubeSongActions({
  videoId,
  onPanelOpen,
}: {
  videoId: string;
  onPanelOpen: () => void;
}) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [panel, setPanel] = useState<"comments" | "channel" | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const key = ["youtube-rating", userId, videoId];
  const rating = useQuery({
    queryKey: key,
    queryFn: () => getYouTubeRating(videoId),
    enabled: !!userId,
    staleTime: 60000,
    retry: false,
  });
  const details = useQuery({
    queryKey: ["youtube-reel-details", videoId],
    queryFn: () => fetchYouTubeReelDetails({ data: { videoId } }),
    staleTime: 300000,
    retry: false,
  });
  const like = useMutation({
    mutationFn: () => setYouTubeRating(videoId, rating.data === "like" ? "none" : "like"),
    onSuccess: (next) => qc.setQueryData(key, next),
    onError: (error) => {
      if (error instanceof YouTubeConnectionRequired) setConnectOpen(true);
      else toast.error(error.message);
    },
  });
  function open(section: "comments" | "channel") {
    onPanelOpen();
    setPanel(section);
  }
  return (
    <>
      <div
        className="mt-5 flex items-center justify-center gap-5"
        aria-label="YouTube song actions"
      >
        <button
          type="button"
          className="flex min-h-11 items-center gap-2 text-sm"
          disabled={rating.isLoading || like.isPending}
          aria-pressed={rating.data === "like"}
          aria-label={rating.data === "like" ? "Unlike on YouTube" : "Like on YouTube"}
          onClick={() => {
            if (!userId) {
              toast.error("Sign in to like songs");
              return;
            }
            if (rating.error instanceof YouTubeConnectionRequired) setConnectOpen(true);
            else like.mutate();
          }}
        >
          <Heart
            className={`h-5 w-5 ${rating.data === "like" ? "fill-current text-rose-500" : ""}`}
          />
          {details.data?.stats.likes != null
            ? Number(details.data.stats.likes).toLocaleString()
            : "Like"}
        </button>
        <button
          type="button"
          className="flex min-h-11 items-center gap-2 text-sm"
          onClick={() => open("comments")}
          aria-label="YouTube comments"
        >
          <MessageCircle className="h-5 w-5" />
          {details.data?.stats.comments != null
            ? Number(details.data.stats.comments).toLocaleString()
            : "Comments"}
        </button>
        <button
          type="button"
          className="flex min-h-11 items-center gap-2 text-sm"
          onClick={() => open("channel")}
        >
          <UserRound className="h-5 w-5" />
          Creator
        </button>
      </div>
      {panel && (
        <YouTubeReelSheet
          videoId={videoId}
          section={panel}
          returnTo="/music"
          onClose={() => setPanel(null)}
        />
      )}
      {connectOpen && (
        <Dialog open onOpenChange={setConnectOpen}>
          <DialogContent className="z-[110]">
            <DialogHeader>
              <DialogTitle>Connect YouTube</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Choose the Google account you use for YouTube. It can have a different email from your
              Nuru account.
            </p>
            <button
              type="button"
              disabled={connecting}
              className="min-h-11 rounded-xl bg-primary px-4 text-primary-foreground"
              onClick={() => {
                setConnecting(true);
                void connectYouTube(videoId, "/music").catch((e) => {
                  setConnecting(false);
                  toast.error(e.message);
                });
              }}
            >
              {connecting ? "Connecting…" : "Continue with Google"}
            </button>
            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary"
            >
              Open on YouTube
            </a>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
