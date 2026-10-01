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

/** Hues that sit comfortably on the app's deep navy ground. */
const HUES = [210, 225, 250, 270, 290, 320, 340, 160, 185, 30];

export function generatedAvatar(seed: string, name: string): string {
  const h = hash(seed || name || "nuru");
  const hue = HUES[h % HUES.length]!;
  const hue2 = HUES[(h >> 8) % HUES.length]!;
  const angle = h % 360;
  const initials = initialsOf(name);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
<defs>
<linearGradient id="g" gradientTransform="rotate(${angle} 0.5 0.5)">
<stop offset="0" stop-color="hsl(${hue} 85% 62%)"/>
<stop offset="1" stop-color="hsl(${hue2} 80% 42%)"/>
</linearGradient>
<radialGradient id="s" cx="32%" cy="26%" r="62%">
<stop offset="0" stop-color="#ffffff" stop-opacity="0.45"/>
<stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>
</defs>
<rect width="96" height="96" fill="url(#g)"/>
<circle cx="30" cy="24" r="34" fill="url(#s)"/>
<circle cx="76" cy="82" r="26" fill="hsl(${hue2} 80% 30%)" opacity="0.35"/>
<text x="48" y="49" text-anchor="middle" dominant-baseline="central"
 font-family="Outfit, ui-sans-serif, system-ui, sans-serif" font-size="36" font-weight="600"
 fill="#ffffff" fill-opacity="0.95">${initials}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
