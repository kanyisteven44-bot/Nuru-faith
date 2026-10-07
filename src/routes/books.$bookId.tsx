import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RotateCcw,
  SlidersHorizontal,
  BookOpen,
} from "lucide-react";
import books from "@/data/christianBooks.json";
import { BookCover } from "@/components/nuru/BookCover";
import { fetchBookSection, fetchBookDownload } from "@/lib/bookReader.functions";
import { DEFAULT_READER, parseReaderPreferences, type ReaderPreferences } from "@/lib/bookReader";
import { cn } from "@/lib/utils";
import { SaveOffline } from "@/components/nuru/SaveOffline";

export const Route = createFileRoute("/books/$bookId")({
  head: ({ params }) => ({
    meta: [
      {
        title: `${books.find((book) => String(book.id) === params.bookId)?.title ?? "Book reader"} — Nuru Faith`,
      },
    ],
  }),
  component: ReaderRoute,
});

function ReaderRoute() {
  const { bookId } = Route.useParams();
  const book = books.find((item) => String(item.id) === bookId);
  if (!book)
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Link to="/books" className="text-primary underline">
          Back to books
        </Link>
        <h1 className="mt-8 font-display text-2xl">Book not found</h1>
        <p className="mt-2 text-ink-2">Choose a book from the reading room.</p>
      </main>
    );
  return <BookReader key={book.id} book={book} />;
}

type Book = (typeof books)[number];
function BookReader({ book }: { book: Book }) {
  const [preferences, setPreferences] = useState<ReaderPreferences>({ ...DEFAULT_READER });
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const textTop = useRef<HTMLHeadingElement>(null);
  const storageKey = `nuru:book-reader:v1:${book.id}`;
  useEffect(() => {
    try {
      setPreferences(parseReaderPreferences(window.localStorage.getItem(storageKey)));
    } catch {
      /* Reading still works when storage is blocked. */
    }
    setReady(true);
  }, [storageKey]);
  const reading = useQuery({
    queryKey: ["book-section", book.id, preferences.section],
    queryFn: () => fetchBookSection({ data: { id: book.id, section: preferences.section } }),
    enabled: ready,
    staleTime: 3600000,
    retry: false,
  });
  const page = reading.data;
  useEffect(() => {
    if (!ready || !page) return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ ...preferences, section: page.section }),
      );
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [ready, page, preferences, storageKey]);
  const move = (section: number) => {
    setPreferences((value) => ({ ...value, section }));
    textTop.current?.scrollIntoView({ block: "start", behavior: "instant" });
    textTop.current?.focus({ preventScroll: true });
  };
  const tone = preferences.tone;
  const selectStyle =
    "min-h-11 rounded-xl border border-current/20 bg-transparent px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary";
  const buttonStyle =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-current/20 px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-primary";

  return (
    <main
      style={{ colorScheme: tone === "night" ? "dark" : tone === "paper" ? "light" : "normal" }}
      className={cn(
        "min-h-dvh pb-28 selection:bg-blue-300/30",
        tone === "night"
          ? "bg-[#101c2a] text-[#e7ebef]"
          : tone === "paper"
            ? "bg-[#f7f0e1] text-[#33291e]"
            : "bg-background text-foreground",
      )}
    >
      <header className="sticky top-0 z-20 border-b border-current/10 bg-inherit shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/books" className={buttonStyle}>
            <ArrowLeft className="h-4 w-4" />
            Books
          </Link>
          <div className="min-w-0 text-center">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60">
              Nuru reading room
            </span>
            <span className="block max-w-[40vw] truncate font-display text-sm font-semibold">
              {book.title}
            </span>
          </div>
          <a
            href={book.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open source edition (new tab)"
            className="inline-flex min-h-11 items-center gap-1 text-xs underline"
          >
            Source
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-8 sm:pt-12">
        <section
          className="flex items-center gap-5 rounded-3xl border border-current/10 bg-current/[0.025] p-5 sm:gap-7 sm:p-7"
          aria-label="Book details"
        >
          <BookCover
            id={book.id}
            title={book.title}
            author={book.author}
            className="w-20 shrink-0 shadow-lg sm:w-28"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide opacity-70">{book.category}</p>
            <h1 className="mt-2 font-display text-2xl font-semibold leading-snug sm:text-3xl">
              {book.title}
            </h1>
            <p className="mt-2 text-sm opacity-80">{book.author}</p>
            <p className="mt-3 text-xs opacity-65">
              Archive edition #{book.id} · Project Gutenberg
            </p>
          </div>
        </section>
        <SaveOffline
          key={book.id}
          label="Download book for offline"
          prepare={async () => {
            const download = await fetchBookDownload({ data: { id: book.id } });
            return {
              id: `book:${book.id}`,
              kind: "book",
              title: book.title,
              subtitle: `${book.author} · Project Gutenberg · Source licence preserved in text`,
              sections: download.sections.map((text, i) => ({ title: `Section ${i + 1}`, text })),
            };
          }}
        />
        <details className="group mt-5 rounded-2xl border border-current/15">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary">
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Reading settings
            </span>
            <span className="text-xs font-normal opacity-65">
              {preferences.size} px · {preferences.font === "serif" ? "Serif" : "Sans"}
              <ChevronRight className="ml-2 inline h-4 w-4 transition-transform group-open:rotate-90" />
            </span>
          </summary>
          <div className="border-t border-current/10 p-4">
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-1 items-center gap-2 text-xs">
                Text size
                <select
                  aria-label="Reading text size"
                  className={selectStyle}
                  value={preferences.size}
                  onChange={(event) =>
                    setPreferences((value) => ({ ...value, size: Number(event.target.value) }))
                  }
                >
                  {[18, 20, 22, 24].map((size) => (
                    <option key={size} value={size}>
                      {size} px
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-1 items-center gap-2 text-xs">
                Font
                <select
                  aria-label="Reading font"
                  className={selectStyle}
                  value={preferences.font}
                  onChange={(event) =>
                    setPreferences((value) => ({
                      ...value,
                      font: event.target.value === "sans" ? "sans" : "serif",
                    }))
                  }
                >
                  <option value="serif">Book serif</option>
                  <option value="sans">Clean sans</option>
                </select>
              </label>
              <label className="flex flex-1 items-center gap-2 text-xs">
                View
                <select
                  aria-label="Reading view"
                  className={selectStyle}
                  value={tone}
                  onChange={(event) =>
                    setPreferences((value) => ({
                      ...value,
                      tone: event.target.value as ReaderPreferences["tone"],
                    }))
                  }
                >
                  <option value="app">App theme</option>
                  <option value="paper">Warm paper</option>
                  <option value="night">Night</option>
                </select>
              </label>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs opacity-65" role="status">
              <BookmarkCheck className="h-3.5 w-3.5" />
              {saved
                ? "Your reading section and preferences are saved on this device."
                : "Your place will be saved here when device storage is available."}
            </p>
          </div>
        </details>
        <section
          className="mt-8 rounded-3xl border border-current/10 bg-current/[0.025] px-5 py-6 sm:px-12 sm:py-10"
          aria-label="Book text"
          aria-busy={reading.isFetching}
        >
          <h2
            ref={textTop}
            tabIndex={-1}
            className="scroll-mt-24 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] focus-visible:outline-2 focus-visible:outline-primary"
          >
            <BookOpen className="h-4 w-4" />
            {page ? `Reading section ${page.section + 1} of ${page.total}` : "Your book"}
          </h2>
          {page && (
            <>
              <div
                className="mt-4 h-1 overflow-hidden rounded-full bg-current/10"
                role="progressbar"
                aria-label="Book position"
                aria-valuemin={0}
                aria-valuemax={page.total}
                aria-valuenow={page.section + 1}
              >
                <div
                  className="h-full bg-primary"
                  style={{ width: `${((page.section + 1) / page.total) * 100}%` }}
                />
              </div>
              <label className="mt-4 flex items-center gap-3 text-xs">
                Jump to section
                <select
                  aria-label="Jump to reading section"
                  className={selectStyle}
                  value={page.section}
                  onChange={(event) => move(Number(event.target.value))}
                >
                  {Array.from({ length: page.total }, (_, index) => (
                    <option key={index} value={index}>
                      Section {index + 1}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {reading.isPending && (
            <p className="py-16 text-center text-sm opacity-70" role="status">
              Opening your book…
            </p>
          )}
          {reading.isError && (
            <div role="alert" className="my-8 rounded-2xl border border-current/20 p-5">
              <h3 className="font-semibold">We couldn’t open this edition.</h3>
              <p className="mt-2 text-sm opacity-75">
                The archive may be temporarily unavailable. Try again or read on the original
                source.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className={buttonStyle}
                  onClick={() => void reading.refetch()}
                  disabled={reading.isFetching}
                >
                  <RotateCcw className="h-4 w-4" />
                  Try again
                </button>
                <a
                  href={book.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonStyle}
                >
                  Open source edition
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
          {page && (
            <article
              className="mx-auto my-10 max-w-[58ch] space-y-7 break-words text-pretty sm:my-12"
              style={{
                fontSize: preferences.size,
                lineHeight: 1.9,
                fontFamily:
                  preferences.font === "serif" ? "Georgia, 'Times New Roman', serif" : "inherit",
              }}
            >
              {page.text.split(/\n{2,}/).map((paragraph, index) => (
                <p key={index} className="whitespace-normal">
                  {paragraph}
                </p>
              ))}
            </article>
          )}
          {page && (
            <nav
              aria-label="Reading sections"
              style={{
                backgroundColor:
                  tone === "night" ? "#101c2a" : tone === "paper" ? "#f7f0e1" : "var(--background)",
              }}
              className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-4xl items-center justify-between gap-2 border-t border-current/15 bg-inherit px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
            >
              <button
                type="button"
                className={buttonStyle}
                disabled={reading.isFetching || page.section === 0}
                onClick={() => move(page.section - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="text-center text-xs tabular-nums">
                <span className="block font-semibold">
                  {page.section + 1} / {page.total}
                </span>
                <span className="mt-0.5 block text-[10px] opacity-60">
                  {Math.round(((page.section + 1) / page.total) * 100)}% of sections
                </span>
              </span>
              <button
                type="button"
                className={buttonStyle}
                disabled={reading.isFetching || page.section + 1 >= page.total}
                onClick={() => move(page.section + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          )}
          {page && page.section + 1 === page.total && (
            <p className="mt-5 text-center font-display text-lg">
              You’ve reached the end of this edition.
            </p>
          )}
        </section>
        <footer className="mt-8 border-t border-current/10 pt-4 text-xs leading-relaxed opacity-65">
          Reading sections are sized for the screen; they are not the printed page numbers. The
          source text, including its original notices and licence, is preserved.{" "}
          <a href={book.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
            Edition details and rights information
          </a>
          .
        </footer>
      </div>
    </main>
  );
}
