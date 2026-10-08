import { useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChatAttachmentDownload } from "./ChatAttachmentDownload";

export function ChatPhotoViewer({
  src,
  path,
  filename,
}: {
  src: string;
  path: string;
  filename: string;
}) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setZoom(false);
          setOpen(true);
        }}
        className="block w-full overflow-hidden rounded-xl"
        aria-label="Open shared photo"
      >
        <img
          src={src}
          alt="Shared photo"
          loading="lazy"
          className="max-h-80 w-full object-contain"
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-black p-0 text-white [&>button]:z-10 [&>button]:bg-black/60 [&>button]:p-2">
          <DialogTitle className="sr-only">Shared photo</DialogTitle>
          <DialogDescription className="sr-only">
            View the photo, zoom in, or save the image.
          </DialogDescription>
          <div
            className={`flex min-h-0 flex-1 overflow-auto p-3 pt-16 ${zoom ? "items-start justify-start" : "items-center justify-center"}`}
          >
            <img
              src={src}
              alt="Shared photo"
              className={zoom ? "max-w-none shrink-0" : "max-h-full max-w-full object-contain"}
            />
          </div>
          <div className="flex shrink-0 items-center justify-center gap-4 bg-black px-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-white">
            <button
              type="button"
              onClick={() => setZoom((v) => !v)}
              className="flex min-h-11 items-center gap-2 rounded-full bg-white/15 px-4 text-sm"
            >
              {zoom ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
              {zoom ? "Fit photo" : "Zoom"}
            </button>
            <ChatAttachmentDownload path={path} filename={filename} label="Save photo" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
