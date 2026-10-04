export type YoutubePlayer = {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  setVolume(value: number): void;
  destroy(): void;
  /** Position and seeking, so Nuru's own transport bar can drive the player. */
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
};

/** YouTube's numeric player states, named so call sites read clearly. */
export const PLAYER_STATE = {
  unstarted: -1,
  ended: 0,
  playing: 1,
  paused: 2,
  buffering: 3,
  cued: 5,
} as const;
type PlayerEvent = { target: YoutubePlayer; data: number };
type YoutubeApi = {
  Player: new (
    frame: HTMLIFrameElement,
    options: {
      events: {
        onReady: (event: PlayerEvent) => void;
        onStateChange: (event: PlayerEvent) => void;
        onError: (event: PlayerEvent) => void;
        onAutoplayBlocked: () => void;
      };
    },
  ) => YoutubePlayer;
};
declare global {
  interface Window {
    YT?: YoutubeApi;
    onYouTubeIframeAPIReady?: (() => void) | undefined;
  }
}
let loading: Promise<YoutubeApi> | undefined;

/** Share one official API load; a failed load can be retried. */
export function loadYoutubePlayerApi(): Promise<YoutubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise<YoutubeApi>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      if (window.onYouTubeIframeAPIReady === ready) window.onYouTubeIframeAPIReady = previous;
      if (!error && window.YT?.Player) resolve(window.YT);
      else {
        loading = undefined;
        script.remove();
        reject(error ?? new Error("YouTube player controls could not load."));
      }
    };
    const ready = () => {
      finish();
      previous?.();
    };
    const timeout = window.setTimeout(
      () => finish(new Error("YouTube player controls timed out.")),
      15000,
    );
    window.onYouTubeIframeAPIReady = ready;
    script.onerror = () => finish(new Error("YouTube player controls could not load."));
    document.head.appendChild(script);
  });
  return loading;
}
