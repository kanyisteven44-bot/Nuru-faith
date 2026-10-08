import { useRouterState } from "@tanstack/react-router";
import { isInstalledApp } from "@/lib/pwaMode";
import { useEffect, useState } from "react";

const LEGACY_HOSTS = new Set(["nurufaith.website", "www.nurufaith.website"]);
const NEW_ORIGIN = "https://nurufaith.co.ke";

/**
 * An opt-in move for older PWA installs. Never auto-redirect the legacy host:
 * its service worker, manifest, offline cache and session are origin-scoped.
 * The user must first confirm the new installation works.
 */
export function LegacyDomainNotice() {
  const [onLegacyHost, setOnLegacyHost] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [copied, setCopied] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    // Client-only hostname detection avoids different SSR markup for two
    // Vercel domains serving the same built app.
    setOnLegacyHost(LEGACY_HOSTS.has(window.location.hostname.toLowerCase()));
    setInstalled(isInstalledApp());
    try { setDismissed(sessionStorage.getItem("nuru-legacy-notice-dismissed") === "1"); } catch { /* blocked storage */ }
  }, []);

  if (!onLegacyHost || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem("nuru-legacy-notice-dismissed", "1"); } catch { /* blocked storage */ }
  };

  const destination = pathname === "/admin"
    ? `${NEW_ORIGIN}/admin?section=dashboard`
    : `${NEW_ORIGIN}/welcome`;

  return (
    <aside
      aria-label="Nuru Faith official website migration"
      className="fixed inset-x-3 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[90] mx-auto max-w-lg rounded-2xl border border-cyan-300/40 bg-[#06172c] p-4 text-white shadow-[0_18px_55px_rgba(0,0,0,0.4)] lg:bottom-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-cyan-100">
            Nuru Faith has a new official address
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-200">
            Please move to nurufaith.co.ke. Sign in there, check your content,
            and install the new app from Chrome. Keep this older installation
            until you know the new one works.
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss move notice until you next open Nuru"
          onClick={dismiss}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/20 text-lg leading-none text-white"
        >
          ×
        </button>
      </div>
      {installed ? (
        <>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(destination);
                setCopied(true);
              } catch {
                // URL is also printed as plain text below for manual copying.
                setCopied(false);
              }
            }}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-cyan-300 px-4 text-sm font-bold text-[#06172c]"
          >
            {copied ? "Official link copied" : "Copy the new website address"}
          </button>
          <p className="mt-2 break-all text-[11px] text-cyan-100">{destination}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
            To avoid opening a Chrome tab inside this older app, open Chrome
            yourself, paste the address, choose Install app, then launch the
            new Nuru Faith icon from your home screen.
          </p>
        </>
      ) : (
        <a
          href={destination}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-cyan-300 px-4 text-sm font-bold text-[#06172c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Open official Nuru Faith
        </a>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
        Your account is still there. You might need to sign in again, and
        downloaded/offline data may not transfer automatically.
      </p>
    </aside>
  );
}
