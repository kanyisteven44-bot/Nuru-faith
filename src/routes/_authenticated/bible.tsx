import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  Search,
  Share2,
  Layers,
  SlidersHorizontal,
  Sparkles,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { NEW_TESTAMENT, OLD_TESTAMENT, type BibleBook } from "@/lib/bible";
import { fetchChapterPassage } from "@/lib/bibleChapter";
import { BIBLE_TOPICS } from "@/lib/content-policy";
import {
  fetchAllHighlights,
  fetchHighlights,
  fetchSavedScriptures,
  HIGHLIGHT_COLORS,
  removeHighlight,
  removeSavedScripture,
  saveScripture,
  setHighlight,
  type HighlightColor,
} from "@/services/series";
import { useShareSheet } from "@/hooks/useShareSheet";
import { BOOK_ART, bookAbbr } from "@/lib/bookArt";
import { AppShell } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, PillTabs } from "@/components/nuru/Primitives";
import { Sheet } from "@/components/nuru/Sheet";
import { NURU_PHOTO_POOLS, useRotatingMedia } from "@/lib/rotatingMedia";

const ALL_BOOKS: BibleBook[] = [...OLD_TESTAMENT, ...NEW_TESTAMENT];

export const Route = createFileRoute("/_authenticated/bible")({
  head: () => ({
    meta: [
      { title: "Bible — Nuru Faith" },
      {
        name: "description",
        content:
          "Read the Bible by book and chapter in modern English, browse topics and keep your saved verses.",
      },
      { property: "og:title", content: "Bible — Nuru Faith" },
      { property: "og:description", content: "Read Scripture and save what speaks to you." },
    ],
  }),
  component: BibleScreen,
});

const TABS = ["Books", "Topics", "Highlights", "My Notes"] as const;
type Tab = (typeof TABS)[number];
type ReaderTarget = { book: BibleBook; chapter: number };

function BibleScreen() {
  const [tab, setTab] = useState<Tab>("Books");
  const [reader, setReader] = useState<ReaderTarget | null>(null);
  const [book, setBook] = useState<BibleBook | null>(null);
  const [query, setQuery] = useState("");
  const bibleHero = useRotatingMedia(NURU_PHOTO_POOLS.bible, "bible-hero");

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
      <header className="relative overflow-hidden">
        <img src={bibleHero} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
        <div className="relative flex items-start justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-5">
          <div>
            <h1 className="font-display text-[34px] leading-none font-bold tracking-tight">
              Bible
            </h1>
            <p className="mt-1.5 text-[13px] text-secondary-foreground">
              Read <span className="text-muted-foreground">•</span> Learn{" "}
              <span className="text-muted-foreground">•</span>{" "}
              <span className="text-cyan">Grow</span>{" "}
              <span className="text-muted-foreground">•</span> Live
            </p>
          </div>
          <p className="script max-w-[7.5rem] text-right text-[22px] leading-[1.1] text-white/90">
            Grow
            <span className="block text-[17px]">in His Word</span>
          </p>
        </div>
      </header>

      <div className="space-y-3 px-4 pb-1">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search books, topics or verses…"
            aria-label="Search the Bible"
            className="input-nuru pr-12 pl-11"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-lg bg-surface-2 p-1.5 text-cyan">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
        </div>
        <PillTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === "Books" && (
        <div className="px-4 pt-3">
          <VerseOfTheDay onOpen={(reference) => openTopicReference(reference, setReader)} />
          <Testament
            title="Old Testament"
            caption="From creation to the coming Messiah"
            books={OLD_TESTAMENT.filter(match)}
            total={OLD_TESTAMENT.length}
            onOpen={setBook}
          />
          <Testament
            title="New Testament"
            caption="The life of Jesus and the early church"
            books={NEW_TESTAMENT.filter(match)}
            total={NEW_TESTAMENT.length}
            onOpen={setBook}
          />
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

      {tab === "Highlights" && (
        <MyHighlights onOpen={(reference) => openTopicReference(reference, setReader)} />
      )}

      {tab === "My Notes" && (
        <SavedVerses onOpen={(reference) => openTopicReference(reference, setReader)} />
      )}
    </AppShell>
  );
}

/**
 * Names that appear in references but are not how the canonical book list
 * spells them. "Psalm 119:105" is the common way to cite a single psalm, and
 * without this the Verse of the Day's Read Now button matched nothing and
 * silently did nothing.
 */
const BOOK_ALIASES: Record<string, string> = {
  psalm: "Psalms",
  "song of songs": "Song of Solomon",
  canticles: "Song of Solomon",
  revelations: "Revelation",
};

function findBook(name: string) {
  const n = name.trim().toLowerCase();
  const direct = ALL_BOOKS.find((b) => b.name.toLowerCase() === n);
  if (direct) return direct;
  const alias = BOOK_ALIASES[n];
  return alias ? ALL_BOOKS.find((b) => b.name === alias) : undefined;
}

function openTopicReference(reference: string, setReader: (target: ReaderTarget) => void) {
  const match = reference.match(/^(.+?)\s+(\d+)/);
  if (!match) return;
  const name = match[1]?.trim();
  const chapter = Number(match[2]);
  const book = name ? findBook(name) : undefined;
  if (book && chapter >= 1 && chapter <= book.chapters) setReader({ book, chapter });
}

/**
 * Reads the chapter in the World English Bible — modern English, public
 * domain, and the same translation the rest of the app uses, so a verse reads
 * identically on Home, in a series session and here.
 *
 * NIV is copyrighted and cannot be served without a publisher licence. The
 * API.Bible integration for it is still in the repo at
 * `src/lib/apiBible.functions.ts`; set BIBLE_API_KEY and call `fetchNivPassage`
 * here to prefer it. It is deliberately not called while no key is configured,
 * since every request would fail and cost a round trip before falling back.
 */
async function fetchScripturePassage(reference: string) {
  return fetchChapterPassage(reference);
}

/** The verse card the design puts above the book list. */
function VerseOfTheDay({ onOpen }: { onOpen: (reference: string) => void }) {
  const reference = "Psalm 119:105";
  const verseArt = useRotatingMedia(NURU_PHOTO_POOLS.bible, "bible-verse-card");
  return (
    <section className="nuru-card relative mb-6 overflow-hidden">
      <img src={verseArt} alt="" className="absolute inset-y-0 right-0 h-full w-1/2 object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#04244d] via-[#04244d]/90 to-transparent" />
      <div className="relative max-w-[62%] p-4">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Verse of the day
        </p>
        <blockquote className="mt-2">
          <p className="font-display text-[17px] leading-snug font-bold text-white">
            “Your word is a lamp to my feet and a light to my path.”
          </p>
          <cite className="mt-1.5 block text-[12px] text-white/70 not-italic">{reference}</cite>
        </blockquote>
        <button
          type="button"
          onClick={() => onOpen(reference)}
          className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full bg-primary px-4 text-[12px] font-semibold text-primary-foreground nuru-glow-sm"
        >
          Read Now <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}

const TESTAMENT_PREVIEW = 8;

function Testament({
  title,
  caption,
  books,
  total,
  onOpen,
}: {
  title: string;
  caption: string;
  books: BibleBook[];
  total: number;
  onOpen: (b: BibleBook) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (books.length === 0) return null;
  const shown = expanded ? books : books.slice(0, TESTAMENT_PREVIEW);
  return (
    <section className="pb-5">
      <div className="mb-3 flex items-start gap-2">
        <Layers className="mt-0.5 h-5 w-5 shrink-0 text-cyan" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[19px] font-bold">{title}</h2>
          <p className="text-[12px] text-muted-foreground">
            {total} books <span className="px-0.5">•</span> {caption}
          </p>
        </div>
        {books.length > TESTAMENT_PREVIEW && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 rounded-xl bg-primary px-3.5 py-2 text-[12px] font-semibold text-primary-foreground"
          >
            {expanded ? "Show less" : "View All"}
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {shown.map((b) => {
          const art = BOOK_ART[b.name];
          return (
            <li key={b.name}>
              <button
                type="button"
                onClick={() => onOpen(b)}
                className="nuru-card flex w-full items-center gap-3 p-2.5 text-left active:opacity-90"
              >
                <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl">
                  {art ? (
                    <img
                      src={art.art}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="block h-full w-full bg-surface-2" />
                  )}
                  <span
                    className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl text-[12px] font-bold text-white shadow-lg shadow-black/40"
                    style={{ backgroundColor: art?.badge ?? "var(--surface-2)" }}
                  >
                    {bookAbbr(b.name)}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{b.name}</span>
                  <span className="block text-[12px] text-muted-foreground">
                    {b.chapters} chapters
                  </span>
                  {art && (
                    <span className="block truncate text-[12px] text-secondary-foreground">
                      {art.tagline}
                    </span>
                  )}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </button>
            </li>
          );
        })}
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
  const shareSheet = useShareSheet();
  const [bookSheetOpen, setBookSheetOpen] = useState(false);
  const [chapterSheetOpen, setChapterSheetOpen] = useState(false);
  const [colorPicker, setColorPicker] = useState<{ verse: number; text: string } | null>(null);

  const passage = useQuery({
    queryKey: ["scripture-passage", reference],
    queryFn: () => fetchScripturePassage(reference),
  });

  const highlightsQuery = useQuery({
    queryKey: ["verse-highlights", userId, reference],
    queryFn: () => fetchHighlights(userId!, reference),
    enabled: !!userId,
  });
  const highlightByVerse = new Map((highlightsQuery.data ?? []).map((h) => [h.verse, h.color]));

  async function invalidateHighlights() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["verse-highlights", userId, reference] }),
      qc.invalidateQueries({ queryKey: ["all-highlights", userId] }),
    ]);
  }

  async function pickColor(color: HighlightColor) {
    if (!userId || !colorPicker) return;
    try {
      await setHighlight({
        userId,
        reference,
        verse: colorPicker.verse,
        verseText: colorPicker.text,
        color,
      });
      await invalidateHighlights();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that highlight");
    } finally {
      setColorPicker(null);
    }
  }

  async function clearHighlight() {
    if (!userId || !colorPicker) return;
    try {
      await removeHighlight(userId, reference, colorPicker.verse);
      await invalidateHighlights();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove that highlight");
    } finally {
      setColorPicker(null);
    }
  }

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
    void shareSheet.share({
      title: text,
      text,
      url: `${window.location.origin}/bible`,
    });
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
              {passage.data.verses.map((v) => {
                const activeColor = highlightByVerse.get(v.verse);
                const swatch = HIGHLIGHT_COLORS.find((c) => c.key === activeColor);
                return (
                  <li key={`${v.chapter}:${v.verse}`} className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-[11px] font-bold text-amber-700">
                      {v.verse}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!userId) {
                          toast.error("Sign in to highlight verses");
                          return;
                        }
                        setColorPicker({ verse: v.verse, text: v.text });
                      }}
                      className={cn(
                        "flex-1 rounded px-1 text-left font-serif text-[15px] leading-relaxed transition-colors",
                        swatch ? swatch.bgClass : "hover:bg-black/[0.03]",
                      )}
                    >
                      {v.text}
                    </button>
                  </li>
                );
              })}
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
            onClick={() => toast("Tap any verse to pick a highlight colour")}
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
              caption="From creation to the coming Messiah"
              total={OLD_TESTAMENT.length}
              books={OLD_TESTAMENT}
              onOpen={(b) => {
                onNavigate(b, 1);
                setBookSheetOpen(false);
              }}
            />
            <Testament
              title="New Testament"
              caption="The life of Jesus and the early church"
              total={NEW_TESTAMENT.length}
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

      {colorPicker && (
        <Sheet
          title={`Highlight verse ${colorPicker.verse}`}
          onClose={() => setColorPicker(null)}
          label="Choose a highlight colour"
        >
          <div className="space-y-4 px-4 pb-6">
            <p className="line-clamp-2 font-serif text-sm text-secondary-foreground">
              {colorPicker.text}
            </p>
            <div className="flex items-center justify-center gap-3">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => void pickColor(c.key)}
                  aria-label={c.label}
                  className="flex h-11 w-11 items-center justify-center rounded-full ring-2 ring-transparent transition-transform active:scale-95"
                  style={{ backgroundColor: c.swatch }}
                >
                  {highlightByVerse.get(colorPicker.verse) === c.key && (
                    <Check className="h-5 w-5 text-black/70" strokeWidth={2.5} />
                  )}
                </button>
              ))}
            </div>
            {highlightByVerse.has(colorPicker.verse) && (
              <button
                type="button"
                onClick={() => void clearHighlight()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-strong py-2.5 text-sm font-semibold text-destructive"
              >
                <X className="h-4 w-4" />
                Remove highlight
              </button>
            )}
          </div>
        </Sheet>
      )}
      {shareSheet.node}
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

function MyHighlights({ onOpen }: { onOpen: (ref: string) => void }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const highlights = useQuery({
    queryKey: ["all-highlights", userId],
    queryFn: () => fetchAllHighlights(userId!),
    enabled: !!userId,
  });

  async function remove(reference: string, verse: number) {
    if (!userId) return;
    await removeHighlight(userId, reference, verse);
    await qc.invalidateQueries({ queryKey: ["all-highlights", userId] });
    await qc.invalidateQueries({ queryKey: ["verse-highlights", userId, reference] });
  }

  if (highlights.isLoading)
    return (
      <div className="px-4 pt-2">
        <CardSkeleton count={3} height="h-14" />
      </div>
    );

  const rows = highlights.data ?? [];
  if (rows.length === 0)
    return (
      <div className="px-4 pt-2">
        <EmptyState
          title="No highlights yet"
          description="Open a chapter and tap a verse to highlight it in a colour of your choice."
        />
      </div>
    );

  return (
    <ul className="space-y-2 px-4 pt-2">
      {rows.map((h) => {
        const swatch = HIGHLIGHT_COLORS.find((c) => c.key === h.color);
        return (
          <li key={h.id} className="nuru-card flex items-center gap-3 px-4 py-3">
            <span
              className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: swatch?.swatch ?? "#f4c453" }}
              aria-hidden
            />
            <button
              type="button"
              onClick={() => onOpen(h.reference)}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block truncate text-sm font-semibold text-cyan">
                {h.reference}:{h.verse}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {h.verse_text}
              </span>
            </button>
            <button
              type="button"
              onClick={() => void remove(h.reference, h.verse)}
              aria-label={`Remove highlight on ${h.reference}:${h.verse}`}
              className="shrink-0 rounded-full p-2 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
