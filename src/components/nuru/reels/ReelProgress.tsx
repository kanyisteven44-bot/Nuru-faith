import { useEffect, useRef, useState } from "react";

/**
 * Thin scrub bar. Owns its own state so time updates never re-render the feed.
 */
export function ReelProgress({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const [percent, setPercent] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const scrubbing = useRef(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const update = () => {
      if (scrubbing.current || !v.duration || !isFinite(v.duration)) return;
      setPercent((v.currentTime / v.duration) * 100);
    };
    v.addEventListener("timeupdate", update);
    v.addEventListener("loadedmetadata", update);
    return () => {
      v.removeEventListener("timeupdate", update);
      v.removeEventListener("loadedmetadata", update);
    };
  }, [videoRef]);

  function seekTo(clientX: number) {
    const track = trackRef.current;
    const v = videoRef.current;
    if (!track || !v || !v.duration || !isFinite(v.duration)) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setPercent(ratio * 100);
    v.currentTime = ratio * v.duration;
  }

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="Video progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      onPointerDown={(e) => {
        scrubbing.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        seekTo(e.clientX);
      }}
      onPointerMove={(e) => scrubbing.current && seekTo(e.clientX)}
      onPointerUp={() => (scrubbing.current = false)}
      onPointerCancel={() => (scrubbing.current = false)}
      onKeyDown={(e) => {
        const v = videoRef.current;
        if (!v) return;
        if (e.key === "ArrowRight") v.currentTime = Math.min(v.duration || 0, v.currentTime + 5);
        if (e.key === "ArrowLeft") v.currentTime = Math.max(0, v.currentTime - 5);
      }}
      className="group flex h-5 w-full cursor-pointer touch-none items-end px-1 pb-0.5"
    >
      <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/25">
        <div className="h-full rounded-full bg-white/90" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
