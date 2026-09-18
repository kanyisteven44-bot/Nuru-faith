import { useCallback, useState } from "react";
import { ShareSheet } from "@/components/nuru/ShareSheet";
import { tryNativeShare, type SharePayload } from "@/lib/share";

/**
 * One share entry point for the whole app: try the OS share sheet first
 * (covers every installed app, not just a fixed list), and only fall back
 * to `ShareSheet`'s platform grid when it's unavailable — mainly desktop.
 */
export function useShareSheet() {
  const [payload, setPayload] = useState<SharePayload | null>(null);

  const share = useCallback(async (next: SharePayload) => {
    const handled = await tryNativeShare(next);
    if (!handled) setPayload(next);
  }, []);

  const node = payload ? <ShareSheet payload={payload} onClose={() => setPayload(null)} /> : null;

  return { share, node };
}
