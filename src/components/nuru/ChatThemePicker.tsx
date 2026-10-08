import { useEffect, useState } from "react";
import { Check, Palette, Search, ImagePlus, Loader2 } from "lucide-react";
import {
  CHAT_THEMES,
  findChatTheme,
  customPhotoTheme,
  FEATURED_CHAT_THEMES,
  chatBubbleStyle,
  chatWallpaperStyle,
} from "@/lib/chatThemes";
import { validateChatWallpaper } from "@/lib/chatWallpaperStorage";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function ChatThemePicker({
  value,
  onChange,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  photoSrc = "",
}: {
  value: string;
  onChange: (id: string, photo?: File) => void | Promise<void>;
  photoSrc?: string;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  hideTrigger?: boolean;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = onOpenChange ?? setLocalOpen;
  const [draft, setDraft] = useState(value);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Featured");
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [pendingSrc, setPendingSrc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setDraft(value);
      setError("");
    } else setPendingPhoto(null);
  }, [open, value]);
  useEffect(() => {
    if (!pendingPhoto) {
      setPendingSrc("");
      return;
    }
    const url = URL.createObjectURL(pendingPhoto);
    setPendingSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingPhoto]);
  const customSrc = pendingSrc || photoSrc;
  const preview =
    draft === "custom" && customSrc ? customPhotoTheme(customSrc) : findChatTheme(draft);
  const style = chatWallpaperStyle;
  const choices = customSrc ? [customPhotoTheme(customSrc), ...CHAT_THEMES] : CHAT_THEMES;
  const options = choices.filter(
    (t) =>
      (category === "All" ||
        (category === "Featured"
          ? FEATURED_CHAT_THEMES.includes(t.id) || t.id === "custom"
          : t.category === category)) &&
      t.name.toLowerCase().includes(query.toLowerCase()),
  );
  if (category === "Featured")
    options.sort(
      (a, b) =>
        (a.id === "custom" ? -1 : FEATURED_CHAT_THEMES.indexOf(a.id)) -
        (b.id === "custom" ? -1 : FEATURED_CHAT_THEMES.indexOf(b.id)),
    );
  return (
    <>
      {!hideTrigger && (
        <button
          type="button"
          onClick={() => {
            setDraft(value);
            setOpen(true);
          }}
          aria-label="Choose chat background"
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-primary hover:bg-primary/10"
        >
          <Palette className="h-4 w-4" /> Theme
        </button>
      )}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!saving) setOpen(next);
        }}
      >
        <DialogContent className="flex h-[90dvh] max-w-xl flex-col gap-3 overflow-hidden rounded-3xl p-4 sm:p-5">
          <DialogTitle>Chat themes</DialogTitle>
          <DialogDescription>
            Matching backgrounds and message colours, or your own photo. Only you see this theme, on
            this device.
          </DialogDescription>
          <div
            className="shrink-0 space-y-2 rounded-2xl border border-white/40 p-4 shadow-inner"
            style={style(preview)}
            aria-label={`Preview: ${preview.name}`}
          >
            <div
              style={chatBubbleStyle(preview, false)}
              className="w-fit rounded-2xl rounded-bl-md px-3 py-2 text-sm shadow-sm"
            >
              Hope your day is going well ✨
            </div>
            <div
              style={chatBubbleStyle(preview, true)}
              className="ml-auto mt-2 w-fit rounded-2xl rounded-br-md px-3 py-2 text-sm shadow-sm"
            >
              Thank you! You too.
            </div>
          </div>
          <label className="flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 text-sm font-semibold text-primary">
            <ImagePlus className="h-5 w-5" /> Upload your photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={saving}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                try {
                  validateChatWallpaper(file);
                  setPendingPhoto(file);
                  setDraft("custom");
                  setError("");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Choose a photo.");
                }
              }}
            />
          </label>
          <label className="flex shrink-0 items-center gap-2 rounded-xl border border-border px-3">
            <Search className="h-4 w-4" />
            <input
              aria-label="Search backgrounds"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search backgrounds…"
              className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <div
            className="flex shrink-0 gap-2 overflow-x-auto pb-1"
            aria-label="Background categories"
          >
            {["Featured", "All", "Gradients", "Patterns", "Colours", "Photos", "Classic"].map(
              (c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                  className={`min-h-10 shrink-0 rounded-full px-3 text-xs ${category === c ? "bg-primary text-primary-foreground" : "bg-surface-2"}`}
                >
                  {c}
                </button>
              ),
            )}
          </div>
          <div
            className="grid min-h-0 flex-1 grid-cols-3 gap-3 overflow-y-auto p-1 sm:grid-cols-4"
            aria-label="Background choices"
          >
            {options.map((t) => (
              <button
                type="button"
                key={t.id}
                disabled={saving}
                aria-pressed={draft === t.id}
                onClick={() => setDraft(t.id)}
                className="rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span
                  style={style(t)}
                  className={`relative block h-28 overflow-hidden rounded-xl border-2 ${draft === t.id ? "border-primary" : "border-border"}`}
                >
                  <span
                    aria-hidden="true"
                    style={chatBubbleStyle(t, false)}
                    className="absolute left-2 top-4 h-4 w-10 rounded-lg shadow-sm"
                  />
                  <span
                    aria-hidden="true"
                    style={chatBubbleStyle(t, true)}
                    className="absolute right-2 top-10 h-4 w-12 rounded-lg shadow-sm"
                  />
                  {draft === t.id && (
                    <Check className="absolute right-1 top-1 h-6 w-6 rounded-full bg-primary p-1 text-white" />
                  )}
                </span>
                <span className="mt-1 block text-xs leading-snug">{t.name}</span>
              </button>
            ))}
            {!options.length && <p className="col-span-3 py-5 text-sm">No backgrounds found.</p>}
          </div>
          {error && (
            <p role="alert" className="shrink-0 text-xs text-rose-600">
              {error}
            </p>
          )}
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setDraft("classic")}
              disabled={saving}
              className="min-h-11 px-2 text-sm"
            >
              Reset
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="min-h-11 rounded-full border border-border px-4 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || (draft === "custom" && !customSrc)}
                onClick={async () => {
                  setSaving(true);
                  setError("");
                  try {
                    await onChange(
                      draft,
                      draft === "custom" ? (pendingPhoto ?? undefined) : undefined,
                    );
                    setOpen(false);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Couldn't apply the background.");
                  } finally {
                    setSaving(false);
                  }
                }}
                className="min-h-11 rounded-full bg-primary px-4 text-sm text-primary-foreground"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </span>
                ) : (
                  "Apply theme"
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
