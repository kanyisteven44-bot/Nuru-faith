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

/** The former apex app origin. It will become a separate ministry website, so
 * the youth app no longer treats it as official — but already-installed PWAs
 * on it must still finish sign-in on their own origin until that cutover.
 */
export function isFormerApexHost(hostname: string): boolean {
  return ["nurufaith.co.ke", "www.nurufaith.co.ke"].includes(hostname.toLowerCase());
}

export function loginCallbackOrigin(
  currentOrigin: string,
  hostname: string,
  installed: boolean,
  officialOrigin = "https://app.nurufaith.co.ke",
): string {
  // Sessions, browser storage and OAuth callbacks do not transfer between
  // domains. An already-installed legacy PWA must complete authentication
  // on the same origin; moving domains happens separately and voluntarily.
  if (installed && (isLegacyNuruHost(hostname) || isFormerApexHost(hostname))) return currentOrigin;
  return officialOrigin;
}


/**
 * Route ordinary browser visitors off the deprecated domain. Never route an
 * existing installed PWA away from its own origin: storage, offline downloads,
 * service workers and Google callbacks are scoped to that origin.
 *
 * Exempt authentication callbacks and reset tokens even when opened as a
 * browser tab. Those must finish on the domain in the emailed/OAuth URL.
 */
export function canonicalBrowserDestination(href: string, installed: boolean): string | null {
  try {
    const url = new URL(href);
    if (installed || !isLegacyNuruHost(url.hostname)) return null;
    if (!["https:", "http:"].includes(url.protocol)) return null;

    const callbackPaths = new Set([
      "/auth-callback",
      "/reset-password",
      "/verify",
      "/confirm",
      "/auth/confirm",
    ]);
    if (callbackPaths.has(url.pathname)) return null;

    const authParams = ["code", "token", "token_hash", "access_token", "refresh_token", "error", "state"];
    if (authParams.some((param) => url.searchParams.has(param))) return null;
    if (/(?:^|[&#])(?:access_token|refresh_token|code|token_hash)=/.test(url.hash)) return null;

    url.protocol = "https:";
    url.hostname = "app.nurufaith.co.ke";
    url.port = "";
    return url.toString();
  } catch {
    return null;
  }
}


/** Before-hydration redirect: runs before auth route guards, so old links to
 * /admin don't turn into a generic /auth and lose their intended destination.
 * Still preserves the legacy installed PWA and sensitive OAuth/reset URLs.
 */
export const LEGACY_CANONICAL_INIT_SCRIPT = String.raw`(function () {
  try {
    var url = new URL(window.location.href);
    if (url.hostname !== "nurufaith.website" && url.hostname !== "www.nurufaith.website") return;
    if (window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches ||
        navigator.standalone === true) return;
    var path = url.pathname;
    var sensitive = ["/auth-callback","/reset-password","/verify","/confirm","/auth/confirm"].includes(path) ||
      ["code","token","token_hash","access_token","refresh_token","error","state"].some(function (key) { return url.searchParams.has(key); }) ||
      /(?:^|[&#])(?:access_token|refresh_token|code|token_hash)=/.test(url.hash);
    if (sensitive) {
      try { sessionStorage.setItem("nuru-legacy-auth-in-progress", "1"); } catch (e) {}
      return;
    }
    try { if (sessionStorage.getItem("nuru-legacy-auth-in-progress") === "1") return; } catch (e) {}
    url.hostname = "app.nurufaith.co.ke";
    url.protocol = "https:";
    url.port = "";
    window.location.replace(url.href);
  } catch (e) { /* best-effort: client router fallback will still run */ }
})();`;


/**
 * Use Google's in-page identity button for the new installed Android PWA.
 * It returns an ID token directly to Supabase without leaving Nuru's app
 * scope for an external Chrome Custom Tab.
 *
 * Keep an explicit kill switch (VITE_GOOGLE_EMBEDDED_ENABLED=false) and
 * use browser OAuth as a fallback if the browser/provider cannot support it.
 * Never enable this automatically for old installed .website origins.
 */
export function shouldUseEmbeddedGoogleSignIn({
  installed,
  hostname,
  clientId,
  setting,
}: {
  installed: boolean;
  hostname: string;
  clientId?: string;
  setting?: string;
}): boolean {
  return (
    installed &&
    (hostname.toLowerCase() === "app.nurufaith.co.ke" || isFormerApexHost(hostname)) &&
    setting !== "false" &&
    typeof clientId === "string" &&
    /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId)
  );
}
