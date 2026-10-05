import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { MediaItem } from "@/services/media";

/**
 * One queue for the whole app, so a song keeps playing while you browse.
 *
 * The provider owns *what* is playing; the player component owns the YouTube
 * surface and registers its handle here so the transport bar can seek. Only
 * one player surface may be mounted at a time — that is what keeps a single
 * song playing instead of several at once.
 */

export type NowPlayingTrack = Pick<
  MediaItem,
  | "id"
  | "source"
  | "external_id"
  | "title"
  | "creator_name"
  | "thumbnail_url"
  | "duration_seconds"
  /**
   * Podcast episodes come from publisher RSS with a real audio enclosure, so
   * they play through a plain audio element and the artwork is a still. Songs
   * come from YouTube and must use its embedded player.
   */
  | "audio_url"
>;

type Transport = {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
};

/** Off, repeat the whole queue, or repeat this one track. */
export type RepeatMode = "off" | "all" | "one";

type NowPlayingValue = {
  queue: NowPlayingTrack[];
  index: number;
  track: NowPlayingTrack | null;
  playing: boolean;
  expanded: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  /** Start a queue at a chosen track. */
  play(tracks: NowPlayingTrack[], startAt?: number): void;
  toggle(): void;
  setPlaying(value: boolean): void;
  next(): void;
  /** The track reached its end on its own — repeat decides what happens. */
  trackEnded(): void;
  previous(): void;
  stop(): void;
  setExpanded(value: boolean): void;
  toggleShuffle(): void;
  cycleRepeat(): void;
  /** The player surface registers itself here; null when it unmounts. */
  attachTransport(transport: Transport | null): void;
  transport: React.RefObject<Transport | null>;
};

const NowPlayingContext = createContext<NowPlayingValue | null>(null);

/** Fisher-Yates over the indices after `keep`, so the current song stays put. */
function shuffleRest(tracks: NowPlayingTrack[], keep: number): NowPlayingTrack[] {
  const head = tracks.slice(0, keep + 1);
  const rest = tracks.slice(keep + 1);
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j]!, rest[i]!];
  }
  return [...head, ...rest];
}

export function NowPlayingProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<NowPlayingTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const transport = useRef<Transport | null>(null);

  const play = useCallback((tracks: NowPlayingTrack[], startAt = 0) => {
    if (!tracks.length) return;
    const start = Math.min(Math.max(0, startAt), tracks.length - 1);
    setQueue(tracks);
    setIndex(start);
    setPlaying(true);
    setExpanded(true);
  }, []);

  const next = useCallback(() => {
    setIndex((current) => {
      if (current + 1 >= queue.length) {
        // Pressing next past the end wraps only when repeating the queue.
        if (repeat === "all" && queue.length > 0) {
          setPlaying(true);
          return 0;
        }
        setPlaying(false);
        return current;
      }
      setPlaying(true);
      return current + 1;
    });
  }, [queue.length, repeat]);

  /**
   * A track finishing on its own is not the same as pressing next: "repeat
   * one" restarts it rather than advancing.
   */
  const trackEnded = useCallback(() => {
    if (repeat === "one") {
      transport.current?.seekTo(0, true);
      setPlaying(true);
      return;
    }
    next();
  }, [repeat, next]);

  const previous = useCallback(() => {
    // Matches every music player: part-way in, the button restarts the song.
    const elapsed = transport.current?.getCurrentTime() ?? 0;
    if (elapsed > 3) {
      transport.current?.seekTo(0, true);
      return;
    }
    setIndex((current) => Math.max(0, current - 1));
    setPlaying(true);
  }, []);

  const stop = useCallback(() => {
    setPlaying(false);
    setExpanded(false);
    setQueue([]);
    setIndex(0);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((on) => {
      if (!on) setQueue((tracks) => shuffleRest(tracks, index));
      return !on;
    });
  }, [index]);

  const cycleRepeat = useCallback(() => {
    setRepeat((mode) => (mode === "off" ? "all" : mode === "all" ? "one" : "off"));
  }, []);

  const attachTransport = useCallback((value: Transport | null) => {
    transport.current = value;
  }, []);

  const value = useMemo<NowPlayingValue>(
    () => ({
      queue,
      index,
      track: queue[index] ?? null,
      playing,
      expanded,
      shuffle,
      repeat,
      play,
      toggle: () => setPlaying((on) => !on),
      setPlaying,
      next,
      trackEnded,
      previous,
      stop,
      setExpanded,
      toggleShuffle,
      cycleRepeat,
      attachTransport,
      transport,
    }),
    [
      queue,
      index,
      playing,
      expanded,
      shuffle,
      repeat,
      play,
      next,
      trackEnded,
      previous,
      stop,
      toggleShuffle,
      cycleRepeat,
      attachTransport,
    ],
  );

  return <NowPlayingContext.Provider value={value}>{children}</NowPlayingContext.Provider>;
}

export function useNowPlaying(): NowPlayingValue {
  const context = useContext(NowPlayingContext);
  if (!context) throw new Error("useNowPlaying must be used inside NowPlayingProvider");
  return context;
}
