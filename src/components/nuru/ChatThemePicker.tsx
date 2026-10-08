import { useState } from "react";
import { Check, Palette, Search } from "lucide-react";
import { CHAT_THEMES, findChatTheme, type ChatTheme } from "@/lib/chatThemes";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function ChatThemePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const preview = findChatTheme(draft);
  const style = (theme: ChatTheme) => ({
    background: theme.background,
    backgroundSize: theme.size,
    backgroundPosition: theme.position,
  });
  const options = CHAT_THEMES.filter(
    (t) =>
      (category === "All" || t.category === category) &&
      t.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90dvh] max-w-xl flex-col gap-3 overflow-hidden rounded-3xl p-5">
          <DialogTitle>Chat backgrounds</DialogTitle>
          <DialogDescription>
            100 backgrounds. Your choice is saved for this chat on this device.
          </DialogDescription>
          <div
            className="shrink-0 rounded-2xl p-4"
            style={style(preview)}
            aria-label={`Preview: ${preview.name}`}
          >
            <div className="w-fit rounded-2xl rounded-bl-md bg-white px-3 py-2 text-sm text-slate-800 shadow-sm">
              Hope your day is going well ✨
            </div>
            <div className="ml-auto mt-2 w-fit rounded-2xl rounded-br-md bg-[#397cd5] px-3 py-2 text-sm text-white shadow-sm">
              Thank you! You too.
            </div>
          </div>
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
            {["All", "Gradients", "Patterns", "Colours", "Photos", "Classic"].map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={`min-h-10 shrink-0 rounded-full px-3 text-xs ${category === c ? "bg-primary text-primary-foreground" : "bg-surface-2"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div
            className="grid min-h-0 flex-1 grid-cols-3 gap-3 overflow-y-auto p-1 sm:grid-cols-4"
            aria-label="Background choices"
          >
            {options.map((t) => (
              <button
                type="button"
                key={t.id}
                aria-pressed={draft === t.id}
                onClick={() => setDraft(t.id)}
                className="rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span
                  style={style(t)}
                  className={`relative block h-20 rounded-xl border-2 ${draft === t.id ? "border-primary" : "border-border"}`}
                >
                  {draft === t.id && (
                    <Check className="absolute right-1 top-1 h-6 w-6 rounded-full bg-primary p-1 text-white" />
                  )}
                </span>
                <span className="mt-1 block text-[11px] leading-tight">{t.name}</span>
              </button>
            ))}
            {!options.length && <p className="col-span-3 py-5 text-sm">No backgrounds found.</p>}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setDraft("classic")}
              className="min-h-11 px-2 text-sm"
            >
              Reset
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-11 rounded-full border border-border px-4 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(draft);
                  setOpen(false);
                }}
                className="min-h-11 rounded-full bg-primary px-4 text-sm text-primary-foreground"
              >
                Apply theme
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
