import { useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom sheet with an intentional drag-to-dismiss gesture.
 * The drag handle is the only draggable area, so scrolling the body never closes the sheet.
 */
export function Sheet({
  title,
  onClose,
  children,
  footer,
  height = "max-h-[78dvh]",
  label,
}: {
  title?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  height?: string;
  label: string;
}) {
  const [offset, setOffset] = useState(0);
  const start = useRef<number | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    start.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (start.current === null) return;
    setOffset(Math.max(0, e.clientY - start.current));
  }
  function onPointerUp() {
    if (offset > 90) onClose();
    setOffset(0);
    start.current = null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <button type="button" aria-label="Close" className="flex-1 bg-black/60" onClick={onClose} />
      <div
        style={offset ? { transform: `translateY(${offset}px)` } : undefined}
        className={cn(
          "flex flex-col overflow-hidden rounded-t-3xl border-t border-border bg-surface transition-transform",
          height,
        )}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="shrink-0 cursor-grab touch-none pt-2 active:cursor-grabbing"
        >
          <span aria-hidden="true" className="mx-auto block h-1 w-10 rounded-full bg-border" />
          {title && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">{title}</div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-2 text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer}
      </div>
    </div>
  );
}
