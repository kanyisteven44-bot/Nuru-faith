import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { WifiOff } from "lucide-react";

/** Design screen 22 — shown whenever the browser reports it is offline. */
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-8 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/35 bg-primary/12 text-cyan">
        <WifiOff className="h-8 w-8" strokeWidth={1.6} />
      </span>
      <h1 className="mt-6 font-display text-xl font-semibold">You're offline</h1>
      <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
        You can still read your downloaded content, saved devotionals and notes.
      </p>
      <div className="mt-7 w-full max-w-xs space-y-2.5">
        <Link
          to="/profile"
          className="flex min-h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground nuru-glow-sm"
        >
          Go to My Downloads
        </Link>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex min-h-11 w-full items-center justify-center rounded-xl border border-border-strong bg-surface-2 text-sm font-semibold text-secondary-foreground"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
