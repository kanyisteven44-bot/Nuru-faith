/** Android Chrome PWAs run standalone. Regular website tabs do not.
 * Keep this client-only so SSR remains identical on all Nuru domains.
 */
export function isInstalledApp(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isLegacyNuruHost(hostname: string): boolean {
  return ["nurufaith.website", "www.nurufaith.website"].includes(hostname.toLowerCase());
}

export function loginCallbackOrigin(
  currentOrigin: string,
  hostname: string,
  installed: boolean,
  officialOrigin = "https://nurufaith.co.ke",
): string {
  // Sessions, browser storage and OAuth callbacks do not transfer between
  // domains. An already-installed legacy PWA must complete authentication
  // on the same origin; moving domains happens separately and voluntarily.
  if (installed && isLegacyNuruHost(hostname)) return currentOrigin;
  return officialOrigin;
}
