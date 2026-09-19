import { cn } from "@/lib/utils";

/**
 * The Nuru AI mascot: a glowing ring around a dark face, a cross on its brow
 * and two arcs for contented eyes. Drawn rather than shipped as an image so it
 * stays crisp at any size and keeps its glow on the app's dark surfaces.
 */
export function NuruAiMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      role="presentation"
      viewBox="0 0 120 120"
      className={cn("h-full w-full", className)}
    >
      <defs>
        <linearGradient
          id="nuru-ai-ring"
          x1="60"
          y1="14"
          x2="60"
          y2="106"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#7fe7ff" />
          <stop offset="1" stopColor="#168cff" />
        </linearGradient>
        <radialGradient id="nuru-ai-face" cx="0.5" cy="0.38" r="0.75">
          <stop offset="0" stopColor="#0a1c33" />
          <stop offset="1" stopColor="#01060f" />
        </radialGradient>
        <filter id="nuru-ai-bloom" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="nuru-ai-softbloom" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ears, set behind the head */}
      <g filter="url(#nuru-ai-bloom)">
        <rect x="6" y="48" width="13" height="26" rx="6.5" fill="url(#nuru-ai-ring)" />
        <rect x="101" y="48" width="13" height="26" rx="6.5" fill="url(#nuru-ai-ring)" />
      </g>

      {/* Halo */}
      <circle
        cx="60"
        cy="60"
        r="43"
        fill="none"
        stroke="url(#nuru-ai-ring)"
        strokeWidth="5"
        filter="url(#nuru-ai-bloom)"
      />

      <circle cx="60" cy="60" r="38" fill="url(#nuru-ai-face)" />

      {/* Cross on the brow */}
      <g stroke="#ffffff" strokeWidth="3" strokeLinecap="round" filter="url(#nuru-ai-softbloom)">
        <line x1="60" y1="31" x2="60" y2="48" />
        <line x1="52.5" y1="37.5" x2="67.5" y2="37.5" />
      </g>

      {/* Contented eyes */}
      <g
        fill="none"
        stroke="#ffffff"
        strokeWidth="4.5"
        strokeLinecap="round"
        filter="url(#nuru-ai-softbloom)"
      >
        <path d="M40 70c3-9 11-9 14 0" />
        <path d="M66 70c3-9 11-9 14 0" />
      </g>
    </svg>
  );
}
