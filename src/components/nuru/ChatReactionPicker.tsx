import { useState } from "react";
import { Search, X } from "lucide-react";
import {
  EMOJI_GROUPS,
  STICKERS,
  STICKER_PACKS,
  STICKER_BY_ID,
  emojiMatches,
} from "@/lib/chatReactions";
import { cn } from "@/lib/utils";

export function ChatStickerArt({
  code,
  fallback,
  small = false,
}: {
  code: string;
  fallback?: string;
  small?: boolean;
}) {
  const sticker = STICKER_BY_ID.get(code);
  if (!sticker)
    return (
      <span className={small ? "text-4xl" : "text-5xl"}>
        {code.startsWith("nuru:") ? fallback || "Sticker" : code}
      </span>
    );
  return (
    <span
      role="img"
      aria-label={sticker.label}
      className={cn(
        "relative mx-auto flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-[28%] border-[3px] border-white px-2 text-center shadow-md",
        small ? "max-w-28" : "w-36 max-w-full",
      )}
      style={{
        background: `radial-gradient(circle at 25% 20%, white, ${sticker.color})`,
        color: "#172554",
      }}
    >
      <span aria-hidden="true" className="absolute right-2 top-1 text-lg opacity-40">
        ✦
      </span>
      <span aria-hidden="true" className={cn("drop-shadow-sm", small ? "text-4xl" : "text-6xl")}>
        {sticker.emoji}
      </span>
      <span
        aria-hidden="true"
        className={cn("mt-1 font-bold leading-tight", small ? "text-[10px]" : "text-sm")}
      >
        {sticker.label}
      </span>
      <span
        aria-hidden="true"
        className="absolute bottom-1 text-[7px] font-semibold tracking-widest opacity-35"
      >
        NURU
      </span>
    </span>
  );
}

export function ChatReactionPicker({
  kind,
  onEmoji,
  onSticker,
  onClose,
  disabled,
}: {
  kind: "emoji" | "sticker";
  onEmoji: (symbol: string) => void;
  onSticker: (code: string) => void;
  onClose: () => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Common");
  const [pack, setPack] = useState("Everyday");
  const tabs = kind === "emoji" ? EMOJI_GROUPS.map((group) => group.name) : STICKER_PACKS;
  const active = kind === "emoji" ? category : pack;
  const groups = query.trim()
    ? EMOJI_GROUPS
    : EMOJI_GROUPS.filter((group) => group.name === category);
  const symbols = [
    ...new Set(
      groups.flatMap((group) =>
        group.symbols.split(" ").filter((symbol) => emojiMatches(symbol, group.name, query)),
      ),
    ),
  ];
  const stickers = STICKERS.filter((sticker) =>
    query.trim()
      ? `${sticker.label} ${sticker.pack} ${sticker.emoji}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      : sticker.pack === pack,
  );
  return (
    <section
      aria-label={kind === "emoji" ? "Emoji picker" : "Sticker picker"}
      className="mb-3 overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-lg"
    >
      <header className="flex items-center justify-between px-3 pt-2">
        <div>
          <h3 className="text-sm font-semibold">
            {kind === "emoji" ? "Emojis" : "Nuru sticker packs"}
          </h3>
          {kind === "sticker" && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {STICKERS.length.toLocaleString()} stickers · {STICKER_PACKS.length} packs
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close picker"
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-card"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <label className="mx-3 mb-2 flex items-center gap-2 rounded-xl border border-border bg-card px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            kind === "emoji"
              ? "Search emojis: love, laugh, pray…"
              : "Search stickers: birthday, church, music, family…"
          }
          aria-label={kind === "emoji" ? "Search emojis" : "Search stickers"}
          className="min-h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
          maxLength={80}
        />
      </label>
      <div className="flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Categories">
        {tabs.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={active === name && !query}
            onClick={() => {
              if (kind === "emoji") setCategory(name);
              else setPack(name);
              setQuery("");
            }}
            className={cn(
              "min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold",
              active === name && !query
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground",
            )}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="max-h-64 overflow-y-auto overscroll-contain p-3">
        {kind === "emoji" ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(42px,1fr))] gap-1">
            {symbols.map((symbol) => (
              <button
                key={symbol}
                type="button"
                disabled={disabled}
                onClick={() => onEmoji(symbol)}
                aria-label={`Insert ${symbol}`}
                className="flex h-11 items-center justify-center rounded-xl text-2xl transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
              >
                {symbol}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {stickers.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                disabled={disabled}
                onClick={() => onSticker(sticker.id)}
                aria-label={`Send ${sticker.label} sticker`}
                className="rounded-2xl p-1 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
              >
                <ChatStickerArt code={sticker.id} small />
              </button>
            ))}
          </div>
        )}
        {(kind === "emoji" ? !symbols.length : !stickers.length) && (
          <p role="status" className="py-6 text-center text-sm text-muted-foreground">
            No matches. Try another word or choose a category.
          </p>
        )}
      </div>
    </section>
  );
}
