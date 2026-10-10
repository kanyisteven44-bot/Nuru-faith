/** Public links should always lead people to Nuru Faith's verified domain.
 * This is deliberately separate from app navigation and OAuth callbacks:
 * old-domain installed PWAs must keep their own origin until users migrate.
 */
export const OFFICIAL_NURU_ORIGIN = "https://nurufaith.co.ke";

const OLD_NURU_HOSTS = new Set([
  "nurufaith.website",
  "www.nurufaith.website",
  "app.nurufaith.co.ke",
  "www.nurufaith.co.ke",
]);

/** For routes/QR codes built by Nuru itself. */
export function publicNuruUrl(path: string): string {
  const url = new URL(path, OFFICIAL_NURU_ORIGIN);
  // Prevent malformed or user-controlled values leaving the Nuru origin.
  if (url.origin !== OFFICIAL_NURU_ORIGIN) return OFFICIAL_NURU_ORIGIN;
  return url.href;
}

/** Preserve external music/video URLs while migrating legacy Nuru links. */
export function canonicalShareUrl(href: string): string {
  try {
    const url = new URL(href, OFFICIAL_NURU_ORIGIN);
    if (!["https:", "http:"].includes(url.protocol)) return OFFICIAL_NURU_ORIGIN;
    if (OLD_NURU_HOSTS.has(url.hostname.toLowerCase())) {
      url.protocol = "https:";
      url.host = new URL(OFFICIAL_NURU_ORIGIN).host;
    }
    return url.href;
  } catch {
    return OFFICIAL_NURU_ORIGIN;
  }
}
