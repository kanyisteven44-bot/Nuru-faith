/**
 * Deterministic generated avatars.
 *
 * Everyone without an uploaded photo still gets a distinct picture rather than
 * a flat initial: a two-tone gradient orb with soft highlights, derived from a
 * hash of their id so the same person always renders the same avatar. Built as
 * a data: URI so it needs no network, no third-party avatar service and no
 * extra request.
 */

/** FNV-1a — small, stable, and good enough to spread names across the palette. */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "N"
  );
}

/**
 * The five avatar grounds the design system defines — forest, clay, olive,
 * sky and rose — each with the ink that sits on it. A person always lands on
 * the same one because it is picked from the hash of their id.
 */
const GROUNDS = [
  { bg: "#2E4A37", ink: "#DDEFE2", ring: "rgba(134,194,154,.3)" },
  { bg: "#6E3A28", ink: "#FBE3D8", ring: "rgba(224,142,109,.35)" },
  { bg: "#27413A", ink: "#CFEBDD", ring: "rgba(134,194,154,.3)" },
  { bg: "#1C3A4E", ink: "#D3ECFA", ring: "rgba(127,211,255,.3)" },
  { bg: "#4E2A33", ink: "#F4D2DA", ring: "rgba(238,139,123,.3)" },
] as const;

export function generatedAvatar(seed: string, name: string): string {
  const h = hash(seed || name || "nuru");
  const g = GROUNDS[h % GROUNDS.length]!;
  const initials = initialsOf(name);

  // Flat ground with a soft top-left lift, matching the system's avatars.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
<defs>
<radialGradient id="s" cx="34%" cy="26%" r="70%">
<stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/>
<stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>
</defs>
<rect width="96" height="96" fill="${g.bg}"/>
<rect width="96" height="96" fill="url(#s)"/>
<text x="48" y="50" text-anchor="middle" dominant-baseline="central"
 font-family="Manrope, ui-sans-serif, system-ui, sans-serif" font-size="34" font-weight="800"
 letter-spacing="0.5" fill="${g.ink}">${initials}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
