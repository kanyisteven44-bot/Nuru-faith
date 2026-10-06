import { z } from "zod";
import { CoverImage } from "@/components/nuru/CoverImage";
import { BibleReadAloud } from "@/components/nuru/BibleReadAloud";
import { resolveMedia } from "@/lib/media";
import { useEffect, useRef, useState } from "react";
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
  BookOpen,
  Search,
  Share2,
  Sparkles,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  DEFAULT_TRANSLATION,
  TRANSLATIONS,
  NEW_TESTAMENT,
  OLD_TESTAMENT,
  type TranslationId,
  type BibleBook,
} from "@/lib/bible";
import { fetchChapterPassage } from "@/lib/bibleChapter";
import { BIBLE_TOPICS } from "@/lib/content-policy";
import { fetchReadingPlans } from "@/services/content";
import {
  fetchAllHighlights,
  fetchHighlights,
  fetchSeries,
  fetchSavedScriptures,
  HIGHLIGHT_COLORS,
  removeHighlight,
  removeSavedScripture,
  saveScripture,
  setHighlight,
  type HighlightColor,
  type SeriesRow,
} from "@/services/series";
import { useShareSheet } from "@/hooks/useShareSheet";
import { BOOK_ART, bookAbbr } from "@/lib/bookArt";
import { AppShell, BrandBar } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, PillTabs, PrimaryButton } from "@/components/nuru/Primitives";
import { Sheet } from "@/components/nuru/Sheet";

const ALL_BOOKS: BibleBook[] = [...OLD_TESTAMENT, ...NEW_TESTAMENT];

export const Route = createFileRoute("/_authenticated/bible")({
  validateSearch: z.object({ reference: z.string().max(100).optional() }),
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

const TABS = ["Books", "Topics", "Highlights", "Notes"] as const;
type Tab = (typeof TABS)[number];
type ReaderTarget = { book: BibleBook; chapter: number; verse?: number | undefined };

function BibleScreen() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [tab, setTab] = useState<Tab>("Books");
  const [reader, setReader] = useState<ReaderTarget | null>(null);
  const [book, setBook] = useState<BibleBook | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [testament, setTestament] = useState<"Old" | "New">("Old");
  /** What the jump-back row offers — the last book opened this session. */
  const [lastBook, setLastBook] = useState<BibleBook>(OLD_TESTAMENT[0]!);

  useEffect(() => {
    if (!search.reference) return;
    const match = search.reference.match(/^(.+?)\s+(\d+)(?::(\d+))?/);
    if (!match) return;
    const targetBook = findBook(match[1]!);
    const chapter = Number(match[2]);
    if (targetBook && chapter >= 1 && chapter <= targetBook.chapters)
      setReader({ book: targetBook, chapter, verse: match[3] ? Number(match[3]) : undefined });
  }, [search.reference]);

  if (reader)
    return (
      <Reader
        book={reader.book}
        chapter={reader.chapter}
        verse={reader.verse}
        onBack={() => {
          setReader(null);
          void navigate({ search: {} });
        }}
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

  const openBook = (b: BibleBook) => {
    setLastBook(b);
    setBook(b);
  };

  const match = (b: BibleBook) => b.name.toLowerCase().includes(query.trim().toLowerCase());

  const testamentBooks = (testament === "Old" ? OLD_TESTAMENT : NEW_TESTAMENT).filter(match);

  return (
    <AppShell>
      <BrandBar />

      <div className="px-4">
        {/* Serif title with the search control beside it, per the board. */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-[40px] leading-none">Bible</h1>
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label={searchOpen ? "Close search" : "Search the Bible"}
            aria-expanded={searchOpen}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-[linear-gradient(180deg,#143254,#0C2440)] text-ink-2"
          >
            {searchOpen ? <X className="h-4.5 w-4.5" /> : <Search className="h-4.5 w-4.5" />}
          </button>
        </div>

        {searchOpen && (
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search books, topics or verses…"
              aria-label="Search the Bible"
              className="input-nuru pl-11"
            />
          </div>
        )}

        {/* Jump straight back into the book last opened. */}
        <button
          type="button"
          onClick={() => setBook(lastBook)}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-border bg-[linear-gradient(180deg,#12304F,#0D2541)] p-2.5 text-left"
        >
          <span className="nuru-disc h-10 w-10">
            <BookOpen className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </span>
          <span className="min-w-0 flex-1 truncate font-display text-[19px]">{lastBook.name}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={2} />
        </button>

        <Segmented
          className="mt-3"
          options={["Old Testament", "New Testament"]}
          value={testament === "Old" ? "Old Testament" : "New Testament"}
          onChange={(v) => setTestament(v === "Old Testament" ? "Old" : "New")}
        />

        <PillTabs className="mt-3" tabs={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === "Books" && (
        <div className="px-4 pt-4">
          <ReadingPlans />
          <Testament books={testamentBooks} onOpen={openBook} />
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
                  <span className="block truncate text-[11px] text-leaf">{t.reference}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === "Highlights" && (
        <MyHighlights onOpen={(reference) => openTopicReference(reference, setReader)} />
      )}

      {tab === "Notes" && (
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

/** The verse card the design puts above the book list. */
/** Design system v2 segmented control: a capsule with one filled option. */
function Segmented({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex w-full gap-0.5 rounded-full border border-border bg-[#0C2440] p-1",
        className,
      )}
    >
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o)}
            className={cn(
              "h-9 flex-1 rounded-full text-[13px] font-bold transition-colors",
              active
                ? "nuru-raise bg-[linear-gradient(180deg,var(--forest-hi),var(--primary))] text-foreground"
                : "text-ink-3 hover:text-ink-2",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The board's "Reading plans" strip. Rather than invent plans, this shows the
 * Scripture Series that already exist in the library — real multi-session
 * studies — in the board's photo-card treatment.
 */
/** The columns the plan strip needs from a reading_plans row. */
type ReadingPlanRow = {
  id: string;
  title: string;
  description: string | null;
  days: number | null;
  cover_url: string | null;
};

function ReadingPlans() {
  // The real reading plans lead; published series fill the strip out. Both
  // are actual library rows — nothing here is a placeholder plan.
  const plans = useQuery({ queryKey: ["reading-plans"], queryFn: fetchReadingPlans });
  const series = useQuery({
    queryKey: ["series", "reading-plans"],
    queryFn: () => fetchSeries(undefined, undefined, 0, 2),
  });

  const cards: {
    key: string;
    title: string;
    caption: string | null;
    cover: string | null;
    to: { to: "/devotionals" } | { to: "/series/$slug"; params: { slug: string } };
  }[] = [
    ...(plans.data ?? []).map((p: ReadingPlanRow) => ({
      key: `plan-${p.id}`,
      title: p.title,
      caption: p.days ? `A ${p.days}-day journey` : p.description,
      cover: p.cover_url,
      to: { to: "/devotionals" as const },
    })),
    ...(series.data ?? []).map((s: SeriesRow) => ({
      key: `series-${s.id}`,
      title: s.title,
      caption: s.description,
      cover: s.cover_image,
      to: { to: "/series/$slug" as const, params: { slug: s.slug } },
    })),
  ].slice(0, 2);

  if (plans.isLoading || series.isLoading) return <CardSkeleton count={2} height="h-[104px]" />;
  if (cards.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-[22px] leading-none">Reading plans</h2>
        <Link
          to="/series"
          className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-ink-2"
        >
          View all
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>
      <ul className="space-y-2.5">
        {cards.map((c) => (
          <li key={c.key}>
            <Link
              {...c.to}
              className="relative block overflow-hidden rounded-2xl border border-border"
            >
              <CoverImage
                src={resolveMedia(c.cover)}
                alt=""
                className="h-[104px] w-full object-cover"
              />
              <span className="absolute inset-0 bg-[linear-gradient(to_right,rgba(17,23,21,0.92),rgba(17,23,21,0.55)_65%,rgba(17,23,21,0.25))]" />
              <span className="absolute inset-0 flex items-center gap-3 px-4 text-white">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[21px] leading-tight">
                    {c.title}
                  </span>
                  {c.caption && (
                    <span className="mt-0.5 block truncate text-[12px] text-white/85">
                      {c.caption}
                    </span>
                  )}
                </span>
                <span className="nuru-disc nuru-disc-terra h-10 w-10 shrink-0">
                  <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.2} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const TESTAMENT_PREVIEW = 10;

/** The book list for whichever testament the segmented control has selected. */
function Testament({ books, onOpen }: { books: BibleBook[]; onOpen: (b: BibleBook) => void }) {
  const [expanded, setExpanded] = useState(false);
  if (books.length === 0)
    return <p className="py-6 text-center text-[13px] text-ink-3">No books match that search.</p>;
  const shown = expanded ? books : books.slice(0, TESTAMENT_PREVIEW);
  return (
    <section className="pb-5">
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
                    <CoverImage
                      src={resolveMedia(art.art)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="block h-full w-full bg-surface-2" />
                  )}
                  <span
                    className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-lg shadow-black/40"
                    style={{ backgroundColor: art?.badge ?? "var(--surface-2)" }}
                  >
                    {bookAbbr(b.name)}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[18px] leading-tight">
                    {b.name}
                  </span>
                  <span className="block text-[12px] text-ink-3">{b.chapters} chapters</span>
                  {art && (
                    <span className="block truncate text-[12px] text-ink-2">{art.tagline}</span>
                  )}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-ink-3" />
              </button>
            </li>
          );
        })}
      </ul>
      {books.length > TESTAMENT_PREVIEW && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 h-11 w-full rounded-full border border-border-strong bg-[linear-gradient(180deg,#143254,#0C2440)] text-[13px] font-bold text-ink-2"
        >
          {expanded ? "Show fewer books" : `Show all ${books.length} books`}
        </button>
      )}
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
          ? "nuru-raise border-leaf/25 bg-[linear-gradient(180deg,var(--forest-hi),var(--primary))] text-foreground"
          : "border-border-strong bg-[linear-gradient(180deg,#143254,#0C2440)] text-ink-2 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function Reader({
  book,
  chapter,
  verse,
  onBack,
  onNavigate,
}: {
  book: BibleBook;
  chapter: number;
  verse?: number | undefined;
  onBack: () => void;
  onNavigate: (book: BibleBook, chapter: number) => void;
}) {
  const reference = `${book.name} ${chapter}`;
  const { userId } = useAuth();
  const qc = useQueryClient();
  const shareSheet = useShareSheet();
  const [bookSheetOpen, setBookSheetOpen] = useState(false);
  const [translation, setTranslation] = useState<TranslationId>(DEFAULT_TRANSLATION);
  const [fontSize, setFontSize] = useState(17);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nuru-bible-translation");
      if (TRANSLATIONS.some((t) => t.id === saved)) setTranslation(saved as TranslationId);
      const size = Number(localStorage.getItem("nuru-bible-font-size"));
      if (size >= 15 && size <= 23) setFontSize(size);
    } catch {
      /* Reading remains available when browser storage is disabled. */
    }
  }, []);
  const unavailable = translation === "ylt" && OLD_TESTAMENT.some((b) => b.name === book.name);
  const [chapterSheetOpen, setChapterSheetOpen] = useState(false);
  const [colorPicker, setColorPicker] = useState<{ verse: number; text: string } | null>(null);

  const passage = useQuery({
    queryKey: ["scripture-passage", reference, translation],
    queryFn: () => fetchChapterPassage(reference, translation),
    enabled: !unavailable,
  });

  const targetVerse = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (passage.data && verse)
      targetVerse.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [passage.data, verse]);

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
          {translation.toUpperCase()}
        </span>
      </header>

      <div className="mx-4 mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-border-strong bg-surface-2 p-3">
        <label className="min-w-0 flex-1 text-xs text-secondary-foreground">
          Bible translation
          <select
            aria-label="Bible translation"
            value={translation}
            onChange={(e) => {
              const next = e.target.value as TranslationId;
              setTranslation(next);
              try {
                localStorage.setItem("nuru-bible-translation", next);
              } catch {
                /* Optional preference. */
              }
            }}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
          >
            {TRANSLATIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-secondary-foreground">
          Text size
          <select
            aria-label="Bible text size"
            value={fontSize}
            onChange={(e) => {
              const size = Number(e.target.value);
              setFontSize(size);
              try {
                localStorage.setItem("nuru-bible-font-size", String(size));
              } catch {
                /* Optional preference. */
              }
            }}
            className="mt-1 block rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
          >
            <option value={15}>Small</option>
            <option value={17}>Standard</option>
            <option value={20}>Large</option>
            <option value={23}>Extra large</option>
          </select>
        </label>
      </div>
      {unavailable && (
        <div className="px-4">
          <EmptyState
            title="New Testament only"
            description="Young’s Literal Translation is available here for the New Testament. Choose another translation to read this book."
          />
        </div>
      )}
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
            action={<PrimaryButton onClick={() => void passage.refetch()}>Try again</PrimaryButton>}
          />
        )}
        {!unavailable && passage.data && (
          <div className="nuru-card p-5">
            <BibleReadAloud key={`${reference}:${translation}`} verses={passage.data.verses} />
            <ol className="space-y-3.5">
              {passage.data.verses.map((v) => {
                const activeColor = highlightByVerse.get(v.verse);
                const swatch = HIGHLIGHT_COLORS.find((c) => c.key === activeColor);
                return (
                  <li
                    key={`${v.chapter}:${v.verse}`}
                    ref={v.verse === verse ? targetVerse : undefined}
                    className={cn(
                      "flex gap-2.5 scroll-mt-24",
                      v.verse === verse && "rounded-lg bg-primary/10 ring-2 ring-primary/40",
                    )}
                  >
                    <span className="mt-0.5 shrink-0 text-[11px] font-bold text-terra-lt">
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
                      style={{ fontSize }}
                      className={cn(
                        "flex-1 rounded px-1 text-left font-serif leading-relaxed transition-colors",
                        swatch ? swatch.bgClass : "hover:bg-white/[0.05]",
                      )}
                    >
                      {v.text}
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="pt-5 text-[11px] text-ink-3">{passage.data.translation}</p>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-20 z-30 mx-auto max-w-xl px-4">
        <div className="flex items-center justify-around nuru-card border border-border py-2 backdrop-blur-xl">
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
            <h3 className="nuru-eyebrow mb-2">Old Testament</h3>
            <Testament
              books={OLD_TESTAMENT}
              onOpen={(b) => {
                onNavigate(b, 1);
                setBookSheetOpen(false);
              }}
            />
            <h3 className="nuru-eyebrow mb-2">New Testament</h3>
            <Testament
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
    "flex flex-1 flex-col items-center gap-1 text-ink-3 transition-colors hover:text-foreground";
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
            <span className="block truncate text-sm font-semibold text-leaf">{s.reference}</span>
            <span className="block text-[11px] text-muted-foreground">
              Saved {new Date(s.created_at).toLocaleDateString()}
            </span>
          </button>
          <Link
            to="/ai"
            search={{ contextType: "verse", contextLabel: s.reference }}
            aria-label={`Ask Nuru AI about ${s.reference}`}
            className="shrink-0 rounded-full p-2 text-leaf"
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
              style={{ backgroundColor: swatch?.swatch ?? "#e6b566" }}
              aria-hidden
            />
            <button
              type="button"
              onClick={() => onOpen(h.reference)}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block truncate text-sm font-semibold text-leaf">
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
