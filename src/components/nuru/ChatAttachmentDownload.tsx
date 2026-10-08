import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { downloadChatMedia } from "@/services/messaging";
import { chatDownloadName } from "@/lib/chatAttachments";

export function ChatAttachmentDownload({ path, filename }: { path: string; filename?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const blob = await downloadChatMedia(path);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = chatDownloadName(path, filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't download. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void download()}
        aria-label={`Download ${filename || "attachment"}`}
        className="flex min-h-11 items-center gap-2 rounded-full bg-black/10 px-3 text-xs font-semibold disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {busy ? "Downloading…" : "Download"}
      </button>
      {error && (
        <p role="alert" className="mt-1 max-w-64 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
