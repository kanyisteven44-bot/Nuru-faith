import { useEffect, useState } from "react";
import { Download, Copy, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { NuruLockup } from "./Logo";
import type { SharePayload } from "@/lib/share";

export function PassageQr({
  payload,
  translation,
  onClose,
}: {
  payload: SharePayload;
  translation: string;
  onClose: () => void;
}) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setImage("");
    setError("");
    void import("qrcode")
      .then((qr) =>
        qr.toDataURL(payload.url, {
          width: 768,
          margin: 4,
          errorCorrectionLevel: "Q",
          color: { dark: "#07111fff", light: "#ffffffff" },
        }),
      )
      .then((url) => {
        if (active) setImage(url);
      })
      .catch(() => {
        if (active) setError("Could not create the QR code. Try again.");
      });
    return () => {
      active = false;
    };
  }, [payload.url]);
  async function card() {
    if (!image) throw new Error("QR code is still loading.");
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1260;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image export is unavailable.");
    ctx.fillStyle = "#07111f";
    ctx.fillRect(0, 0, 1080, 1260);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 54px sans-serif";
    ctx.fillText("NURU FAITH", 540, 100);
    ctx.font = "bold 34px sans-serif";
    const title = payload.title.length > 55 ? payload.title.slice(0, 52) + "…" : payload.title;
    ctx.fillText(title, 540, 182, 940);
    ctx.fillStyle = "#c9dbed";
    ctx.font = "26px sans-serif";
    ctx.fillText(translation, 540, 232, 940);
    const qr = new Image();
    qr.src = image;
    await qr.decode();
    ctx.drawImage(qr, 156, 280, 768, 768);
    ctx.fillStyle = "#ffffff";
    ctx.font = "30px sans-serif";
    ctx.fillText("Scan to read these verses", 540, 1120);
    ctx.fillStyle = "#c9dbed";
    ctx.font = "24px sans-serif";
    ctx.fillText(new URL(payload.url).hostname, 540, 1175);
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not export the image."))),
        "image/png",
      ),
    );
  }
  async function exportImage(share: boolean) {
    try {
      const blob = await card();
      const name = `Nuru-${payload.title.replace(/[^a-z0-9]+/gi, "-")}-QR.png`;
      const file = new File([blob], name, { type: "image/png" });
      if (share && navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: payload.title });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") toast.error(e.message);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[92dvh] max-w-sm overflow-y-auto rounded-3xl p-5 text-center">
        <NuruLockup className="mx-auto" />
        <DialogTitle>{payload.title}</DialogTitle>
        <DialogDescription>
          {translation} · Scan to read these verses. No sign-in needed.
        </DialogDescription>
        <div className="mx-auto flex aspect-square w-full max-w-[280px] items-center justify-center overflow-hidden rounded-2xl bg-white">
          {image ? (
            <img
              src={image}
              width={280}
              height={280}
              alt={`QR code for ${payload.title}`}
              className="h-full w-full"
            />
          ) : error ? (
            <p role="alert" className="p-5 text-sm text-red-700">
              {error}
            </p>
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">{new URL(payload.url).hostname}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!image}
            onClick={() => void exportImage(false)}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm text-primary-foreground disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Save image
          </button>
          <button
            type="button"
            disabled={!image}
            onClick={() => void exportImage(true)}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" />
            Share QR
          </button>
        </div>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(payload.url);
              toast.success("Verse link copied");
            } catch {
              toast.error("Could not copy. Use your browser’s share menu.");
            }
          }}
          className="flex min-h-11 items-center justify-center gap-2 text-sm text-primary"
        >
          <Copy className="h-4 w-4" />
          Copy verse link
        </button>
      </DialogContent>
    </Dialog>
  );
}
