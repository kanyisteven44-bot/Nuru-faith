import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Connectivity status only. This deliberately does not block the app:
 * already-rendered/static content may still be usable, while fresh Supabase
 * reads and writes must wait for connectivity.
 */
export function OfflineNotice() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-amber-300/30 bg-surface/95 px-4 py-3 shadow-xl backdrop-blur-xl"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-300/10 text-amber-200">
        <WifiOff className="h-4.5 w-4.5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">You’re offline</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Fresh community and account changes will sync after you reconnect.
        </p>
      </div>
    </div>
  );
}
