export function reelPlaybackPolicy({
  near,
  active,
  paused,
  commentsVisible,
  pageVisible,
  autoplayAllowed,
  manualStart,
}: {
  near: boolean;
  active: boolean;
  paused: boolean;
  commentsVisible: boolean;
  pageVisible: boolean;
  autoplayAllowed: boolean;
  manualStart: boolean;
}) {
  const load = near && (autoplayAllowed || manualStart);
  return { load, play: load && active && !paused && !commentsVisible && pageVisible };
}
export function isReelTap(
  start: { x: number; y: number } | null,
  end: { x: number; y: number },
): boolean {
  return !!start && Math.hypot(end.x - start.x, end.y - start.y) <= 12;
}
