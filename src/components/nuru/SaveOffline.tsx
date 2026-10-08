import { useState } from "react";
import { Download, Check } from "lucide-react";
import { toast } from "sonner";
import { saveOfflineReading, type OfflineReading } from "@/lib/offlineReading";
export function SaveOffline({
  prepare,
  label = "Save for offline",
  showReaderLink = true,
}: {
  prepare: (report: (message: string) => void) => Promise<Omit<OfflineReading, "savedAt">>;
  label?: string;
  showReaderLink?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [detail, setDetail] = useState("Downloading…");
  return (
    <div className="my-3 flex flex-wrap items-center gap-3 text-sm">
      <button
        type="button"
        disabled={busy}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-current/20 px-4 disabled:opacity-50"
        onClick={async () => {
          setBusy(true);
          try {
            // Cache the tiny reader before reporting success, including the first visit.
            if (!("serviceWorker" in navigator))
              throw new Error("Offline reading needs a browser with service worker support.");
            await navigator.serviceWorker.register("/sw.js");
            await Promise.race([
              navigator.serviceWorker.ready,
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Offline setup took too long. Try again.")),
                  10000,
                ),
              ),
            ]);
            const cache = await caches.open("nuru-reading-shell-v1");
            await cache.addAll(["/offline.html", "/offline-reader.js"]);
            await saveOfflineReading(await prepare(setDetail));
            void navigator.storage?.persist?.().catch(() => false);
            setSaved(true);
            toast.success("Saved on this device for offline reading");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save offline");
          } finally {
            setBusy(false);
          }
        }}
      >
        {saved ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        {busy ? detail : saved ? "Saved offline" : label}
      </button>
      {showReaderLink && (
        <a href="/offline.html" className="inline-flex min-h-11 items-center text-primary underline">
          Offline reading room
        </a>
      )}
    </div>
  );
}
