/**
 * Keep internal protected links across sign-in. A copied /admin, Bible or
 * message link should open its intended screen after authentication.
 * Store only same-origin Nuru routes; never allow external redirects.
 */
const KEY = "nuru-return-after-login";

export function rememberAfterLogin(href: string, currentOrigin: string): void {
  try {
    const url = new URL(href, currentOrigin);
    if (url.origin !== currentOrigin || !url.pathname.startsWith("/")) return;
    if (/^\/(?:auth|auth-callback|reset-password|logout)(?:\/|$)/.test(url.pathname)) return;
    sessionStorage.setItem(KEY, url.pathname + url.search + url.hash);
  } catch { /* storage blocked; regular Home fallback remains */ }
}

export function takeAfterLogin(currentOrigin: string): string | null {
  try {
    const next = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
    const url = new URL(next, currentOrigin);
    if (url.origin !== currentOrigin || !url.pathname.startsWith("/")) return null;
    if (/^\/(?:auth|auth-callback|reset-password|logout)(?:\/|$)/.test(url.pathname)) return null;
    return url.pathname + url.search + url.hash;
  } catch { return null; }
}
