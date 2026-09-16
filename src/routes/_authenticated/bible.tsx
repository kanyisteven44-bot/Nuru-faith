import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  Search,
  Share2,
  Sparkles,
  SquarePen,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { NEW_TESTAMENT, OLD_TESTAMENT, type BibleBook } from "@/lib/bible";
import { fetchKjvPassage } from "@/lib/kjvBible";
import { BIBLE_TOPICS } from "@/lib/content-policy";
import { fetchSavedScriptures, removeSavedScripture, saveScripture } from "@/services/series";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, PillTabs } from "@/components/nuru/Primitives";
import { Sheet } from "@/components/nuru/reels/Sheet";

const ALL_BOOKS: BibleBook[] = [...OLD_TESTAMENT, ...NEW_TESTAMENT];

export const Route = createFileRoute("/_authenticated/bible")({
  head: () => ({
    meta: [
      { title: "Bible — Nuru Faith" },
      {
        name: "description",
        content:
          "Read the King James Version Bible by book and chapter, browse topics and keep your saved verses.",
      },
      { property: "og:title", content: "Bible — Nuru Faith" },
      { property: "og:description", content: "Read Scripture and save what speaks to you." },
    ],
  }),
  component: BibleScreen,
});

const TABS = ["Books", "Topics", "My Notes"] as const;
type Tab = (typeof TABS)[number];
type ReaderTarget = { book: BibleBook; chapter: number };

function BibleScreen() {
  const [tab, setTab] = useState<Tab>("Books");
  const [reader, setReader] = useState<ReaderTarget | null>(null);
  const [book, setBook] = useState<BibleBook | null>(null);
  const [query, setQuery] = useState("");

  if (reader)
    return (
      <Reader
        book={reader.book}
        chapter={reader.chapter}
        onBack={() => setReader(null)}
        onNavigate={(b, chapter) => setReader({ book: b, chapter })}
      />
    );

  if (book)
    return (
      <ChapterPicker
        book={book}
        onBack={() => setBook(null)}
        onPick={(chapter) => setReader({ book, chapter })}
      />
    );

  const match = (b: BibleBook) => b.name.toLowerCase().includes(query.trim().toLowerCase());

  return (
    <AppShell>
      <ScreenHeader title="Bible" />

      <div className="space-y-3 px-4 pb-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search books, topics or verses…"
            aria-label="Search the Bible"
            className="input-nuru pl-11"
          />
        </div>
        <PillTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === "Books" && (
        <div className="px-4 pt-2">
          <Testament title="Old Testament" books={OLD_TESTAMENT.filter(match)} onOpen={setBook} />
          <Testament title="New Testament" books={NEW_TESTAMENT.filter(match)} onOpen={setBook} />
        </div>
      )}

      {tab === "Topics" && (
        <ul className="space-y-2 px-4 pt-2">
          {BIBLE_TOPICS.filter((t) =>
            `${t.title} ${t.reference}`.toLowerCase().includes(query.trim().toLowerCase()),
          ).map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => openTopicReference(t.reference, setReader)}
                className="nuru-card flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{t.title}</span>
                  <span className="block truncate text-[11px] text-cyan">{t.reference}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === "My Notes" && (
        <SavedVerses onOpen={(reference) => openTopicReference(reference, setReader)} />
      )}
    </AppShell>
  );
}

function openTopicReference(reference: string, setReader: (target: ReaderTarget) => void) {
  const match = reference.match(/^(.+?)\s+(\d+)/);
  if (!match) return;
  const name = match[1]?.trim();
  const chapter = Number(match[2]);
  const book = ALL_BOOKS.find((b) => b.name.toLowerCase() === name?.toLowerCase());
  if (book && chapter >= 1 && chapter <= book.chapters) setReader({ book, chapter });
}

function Testament({
  title,
  books,
  onOpen,
}: {
  title: string;
  books: BibleBook[];
  onOpen: (b: BibleBook) => void;
}) {
  if (books.length === 0) return null;
  return (
    <section className="pb-5">
      <h2 className="mb-2 font-display text-[15px] font-semibold">{title}</h2>
      <ul className="space-y-2">
        {books.map((b) => (
          <li key={b.name}>
            <button
              type="button"
              onClick={() => onOpen(b)}
              className="nuru-card flex w-full items-center gap-3 px-3 py-2.5 text-left"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/35 bg-primary/12 text-[11px] font-bold text-cyan">
                {b.name.slice(0, 2)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{b.name}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {b.chapters} chapters
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChapterPicker({
  book,
  onBack,
  onPick,
}: {
  book: BibleBook;
  onBack: () => void;
  onPick: (chapter: number) => void;
}) {
  return (
    <AppShell>
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-background/90 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to books"
          className="-ml-1 rounded-full p-1.5 text-secondary-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-[22px] font-semibold tracking-tight">{book.name}</h1>
      </header>
      <div className="grid grid-cols-5 gap-2 px-4 pt-2">
        {Array.from({ length: book.chapters }, (_, i) => i + 1).map((c) => (
          <ChapterTile key={c} label={c} onClick={() => onPick(c)} />
        ))}
      </div>
    </AppShell>
  );
}

function ChapterTile({
  label,
  onClick,
  active = false,
}: {
  label: number;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-12 items-center justify-center rounded-xl border text-sm font-bold transition-colors",
        active
          ? "border-transparent bg-[#f4c453] text-[#2a2314] shadow-[0_4px_14px_-6px_rgba(244,196,83,0.7)]"
          : "border-black/[0.08] bg-[#f8f2e2] text-[#2a2314] hover:bg-[#f2e9d1]",
      )}
    >
      {label}
    </button>
  );
}

function Reader({
  book,
  chapter,
  onBack,
  onNavigate,
}: {
  book: BibleBook;
  chapter: number;
  onBack: () => void;
  onNavigate: (book: BibleBook, chapter: number) => void;
}) {
  const reference = `${book.name} ${chapter}`;
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());
  const [bookSheetOpen, setBookSheetOpen] = useState(false);
  const [chapterSheetOpen, setChapterSheetOpen] = useState(false);

  const passage = useQuery({
    queryKey: ["kjv-passage", reference],
    queryFn: () => fetchKjvPassage(reference),
  });

  const bookIndex = ALL_BOOKS.findIndex((b) => b.name === book.name);
  const canGoPrev = !(bookIndex === 0 && chapter === 1);
  const canGoNext = !(bookIndex === ALL_BOOKS.length - 1 && chapter === book.chapters);

  function goPrev() {
    if (!canGoPrev) return;
    if (chapter > 1) onNavigate(book, chapter - 1);
    else if (bookIndex > 0) {
      const prevBook = ALL_BOOKS[bookIndex - 1];
      if (prevBook) onNavigate(prevBook, prevBook.chapters);
    }
  }
  function goNext() {
    if (!canGoNext) return;
    if (chapter < book.chapters) onNavigate(book, chapter + 1);
    else if (bookIndex < ALL_BOOKS.length - 1) {
      const nextBook = ALL_BOOKS[bookIndex + 1];
      if (nextBook) onNavigate(nextBook, 1);
    }
  }

  async function bookmark() {
    if (!userId) {
      toast.error("Sign in to save verses");
      return;
    }
    try {
      await saveScripture(userId, reference);
      await qc.invalidateQueries({ queryKey: ["saved-scriptures", userId] });
      toast.success("Saved to My Notes");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that");
    }
  }

  function share() {
    const text = `${passage.data?.reference ?? reference} — Nuru Faith`;
    if (navigator.share) void navigator.share({ title: text, text }).catch(() => {});
    else {
      void navigator.clipboard?.writeText(text);
      toast.success("Copied");
    }
  }

  return (
    <AppShell>
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-background/90 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="-ml-1 rounded-full p-1.5 text-secondary-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 truncate font-display text-[22px] font-semibold tracking-tight">
          {passage.data?.reference ?? reference}
        </h1>
        <span className="shrink-0 rounded-lg border border-border-strong bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground">
          {passage.data?.translationId ?? "…"}
        </span>
      </header>

      <div className="flex items-center justify-center gap-2 px-4 pb-1 pt-1">
        <button
          type="button"
          onClick={goPrev}
          disabled={!canGoPrev}
          aria-label="Previous chapter"
          className="rounded-full p-2 text-secondary-foreground disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setBookSheetOpen(true)}
          className="flex items-center gap-1 rounded-full border border-border-strong bg-surface-2 px-3 py-1.5 text-xs font-semibold"
        >
          {book.name}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setChapterSheetOpen(true)}
          className="flex items-center gap-1 rounded-full border border-border-strong bg-surface-2 px-3 py-1.5 text-xs font-semibold"
        >
          {chapter}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={!canGoNext}
          aria-label="Next chapter"
          className="rounded-full p-2 text-secondary-foreground disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 pb-28 pt-2">
        {passage.isLoading && <CardSkeleton count={4} height="h-6" />}
        {passage.isError && (
          <EmptyState
            title="Couldn't load that passage"
            description="Check your connection and try again."
          />
        )}
        {passage.data && (
          <div className="rounded-3xl bg-[#f8f2e2] p-5 text-[#2a2314] shadow-lg shadow-black/20">
            <ol className="space-y-3.5">
              {passage.data.verses.map((v) => (
                <li key={`${v.chapter}:${v.verse}`} className="flex gap-2.5">
                  <span className="mt-0.5 shrink-0 text-[11px] font-bold text-amber-700">
                    {v.verse}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setHighlighted((prev) => {
                        const next = new Set(prev);
                        if (next.has(v.verse)) next.delete(v.verse);
                        else next.add(v.verse);
                        return next;
                      })
                    }
                    className={cn(
                      "flex-1 rounded px-1 text-left font-serif text-[15px] leading-relaxed transition-colors",
                      highlighted.has(v.verse) ? "bg-amber-300/50" : "hover:bg-black/[0.03]",
                    )}
                  >
                    {v.text}
                  </button>
                </li>
              ))}
            </ol>
            <p className="pt-5 text-[11px] text-[#8a7a52]">{passage.data.translation}</p>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-20 z-30 mx-auto max-w-xl px-4">
        <div className="flex items-center justify-around rounded-2xl border border-black/10 bg-[#f8f2e2] py-2 shadow-lg shadow-black/20 backdrop-blur-xl">
          <ReaderAction
            icon={Highlighter}
            label="Highlight"
            onClick={() => toast("Tap any verse to highlight it")}
          />
          <ReaderAction icon={Bookmark} label="Bookmark" onClick={() => void bookmark()} />
          <ReaderAction
            icon={SquarePen}
            label="Notes"
            to={{ to: "/ai" as const, search: { contextType: "verse", contextLabel: reference } }}
          />
          <ReaderAction icon={Share2} label="Share" onClick={share} />
        </div>
      </div>

      {bookSheetOpen && (
        <Sheet title="Choose a book" onClose={() => setBookSheetOpen(false)} label="Choose a book">
          <div className="px-4 pb-4">
            <Testament
              title="Old Testament"
              books={OLD_TESTAMENT}
              onOpen={(b) => {
                onNavigate(b, 1);
                setBookSheetOpen(false);
              }}
            />
            <Testament
              title="New Testament"
              books={NEW_TESTAMENT}
              onOpen={(b) => {
                onNavigate(b, 1);
                setBookSheetOpen(false);
              }}
            />
          </div>
        </Sheet>
      )}

      {chapterSheetOpen && (
        <Sheet
          title={`${book.name} — choose a chapter`}
          onClose={() => setChapterSheetOpen(false)}
          label="Choose a chapter"
        >
          <div className="grid grid-cols-5 gap-2 px-4 pb-4">
            {Array.from({ length: book.chapters }, (_, i) => i + 1).map((c) => (
              <ChapterTile
                key={c}
                label={c}
                active={c === chapter}
                onClick={() => {
                  onNavigate(book, c);
                  setChapterSheetOpen(false);
                }}
              />
            ))}
          </div>
        </Sheet>
      )}
    </AppShell>
  );
}

function ReaderAction({
  icon: Icon,
  label,
  onClick,
  to,
}: {
  icon: typeof Bookmark;
  label: string;
  onClick?: () => void;
  to?: { to: "/ai"; search: { contextType: string; contextLabel: string } };
}) {
  const inner = (
    <>
      <Icon className="h-4.5 w-4.5" strokeWidth={1.8} />
      <span className="text-[10px] font-medium">{label}</span>
    </>
  );
  const cls =
    "flex flex-1 flex-col items-center gap-1 text-[#5a4d2f] transition-colors hover:text-[#2a2314]";
  if (to)
    return (
      <Link to={to.to} search={to.search} className={cls}>
        {inner}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function SavedVerses({ onOpen }: { onOpen: (ref: string) => void }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const saved = useQuery({
    queryKey: ["saved-scriptures", userId],
    queryFn: () => fetchSavedScriptures(userId!),
    enabled: !!userId,
  });

  async function remove(reference: string) {
    if (!userId) return;
    await removeSavedScripture(userId, reference);
    await qc.invalidateQueries({ queryKey: ["saved-scriptures", userId] });
  }

  if (saved.isLoading)
    return (
      <div className="px-4 pt-2">
        <CardSkeleton count={3} height="h-14" />
      </div>
    );

  const rows = saved.data ?? [];
  if (rows.length === 0)
    return (
      <div className="px-4 pt-2">
        <EmptyState
          title="No saved verses yet"
          description="Open a chapter and tap Bookmark to keep a verse here."
        />
      </div>
    );

  return (
    <ul className="space-y-2 px-4 pt-2">
      {rows.map((s) => (
        <li key={s.id} className="nuru-card flex items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => onOpen(s.reference)}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block truncate text-sm font-semibold text-cyan">{s.reference}</span>
            <span className="block text-[11px] text-muted-foreground">
              Saved {new Date(s.created_at).toLocaleDateString()}
            </span>
          </button>
          <Link
            to="/ai"
            search={{ contextType: "verse", contextLabel: s.reference }}
            aria-label={`Ask Nuru AI about ${s.reference}`}
            className="shrink-0 rounded-full p-2 text-cyan"
          >
            <Sparkles className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => void remove(s.reference)}
            aria-label={`Remove ${s.reference}`}
            className="shrink-0 rounded-full p-2 text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
