import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  Library,
  MessageCircleMore,
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
import { AppShell } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/bible")({
  head: () => ({
    meta: [
      { title: "KJV Bible — Nuru Faith" },
      {
        name: "description",
        content: "Read the King James Version Bible by book and chapter on Nuru Faith.",
      },
      { property: "og:title", content: "KJV Bible — Nuru Faith" },
      { property: "og:description", content: "Read, highlight, save and reflect on Scripture." },
    ],
  }),
  component: BibleScreen,
});

const TABS = ["Books", "Topics", "Saved"] as const;
type Tab = (typeof TABS)[number];

type ReaderTarget = { book: BibleBook; chapter: number };

function BibleScreen() {
  const [tab, setTab] = useState<Tab>("Books");
  const [book, setBook] = useState<BibleBook | null>(null);
  const [reader, setReader] = useState<ReaderTarget | null>(null);
  const [query, setQuery] = useState("");

  if (reader) {
    return (
      <Reader
        book={reader.book}
        chapter={reader.chapter}
        onBack={() => setReader(null)}
        onChapterChange={(chapter) => setReader({ ...reader, chapter })}
      />
    );
  }

  if (book) {
    return (
      <ChapterPicker
        book={book}
        onBack={() => setBook(null)}
        onPick={(chapter) => setReader({ book, chapter })}
      />
    );
  }

  const normalized = query.trim().toLowerCase();
  const filterBooks = (books: BibleBook[]) =>
    normalized ? books.filter((item) => item.name.toLowerCase().includes(normalized)) : books;

  return (
    <AppShell flush>
      <main className="min-h-full bg-background pb-28">
        <section className="relative overflow-hidden border-b border-border/60 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.22),transparent_42%),linear-gradient(180deg,hsl(var(--surface)),hsl(var(--background)))] px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative mx-auto max-w-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-cyan shadow-sm">
                    <BookOpen className="h-4.5 w-4.5" />
                  </span>
                  <span className="rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan">
                    King James Version
                  </span>
                </div>
                <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Holy Bible</h1>
                <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                  Read slowly. Reflect deeply. Keep the verses that speak to you.
                </p>
              </div>
              <div className="hidden rounded-3xl border border-border/70 bg-surface/70 p-3 shadow-sm sm:block">
                <Library className="h-7 w-7 text-cyan" strokeWidth={1.5} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setReader({ book: { name: "John", chapters: 21 }, chapter: 3 })}
              className="mt-5 w-full rounded-[24px] border border-primary/20 bg-gradient-to-br from-primary/18 via-surface to-surface-2 p-4 text-left shadow-[0_14px_50px_hsl(var(--background)/0.45)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan">Start here</p>
                  <p className="mt-1 font-display text-lg font-semibold text-foreground">John 3</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">Love, salvation and new life in Christ.</p>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <ChevronRight className="h-5 w-5" />
                </span>
              </div>
            </button>
          </div>
        </section>

        <div className="mx-auto max-w-xl px-4 pt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search books or topics"
              aria-label="Search the Bible"
              className="h-12 w-full rounded-2xl border border-border bg-surface pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div className="mt-4 grid grid-cols-3 rounded-2xl border border-border bg-surface-2/70 p-1">
            {TABS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-semibold transition",
                  tab === item
                    ? "bg-surface text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {tab === "Books" && (
          <div className="mx-auto max-w-xl px-4 pt-5">
            <Testament title="Old Testament" subtitle="39 books" books={filterBooks(OLD_TESTAMENT)} onOpen={setBook} />
            <Testament title="New Testament" subtitle="27 books" books={filterBooks(NEW_TESTAMENT)} onOpen={setBook} />
          </div>
        )}

        {tab === "Topics" && (
          <div className="mx-auto max-w-xl px-4 pt-5">
            <div className="mb-3">
              <h2 className="font-display text-lg font-semibold">Explore by topic</h2>
              <p className="text-[12px] text-muted-foreground">Open Scripture around what you are facing today.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {BIBLE_TOPICS.filter((topic) =>
                `${topic.title} ${topic.reference}`.toLowerCase().includes(normalized),
              ).map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => openTopicReference(topic.reference, setReader)}
                  className="group rounded-2xl border border-border bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-surface-2"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-cyan">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">{topic.title}</span>
                      <span className="mt-1 block text-[11px] font-medium text-cyan">{topic.reference}</span>
                    </span>
                    <ChevronRight className="mt-2 h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-cyan" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "Saved" && (
          <div className="mx-auto max-w-xl px-4 pt-5">
            <SavedVerses />
          </div>
        )}
      </main>
    </AppShell>
  );
}

function openTopicReference(reference: string, setReader: (target: ReaderTarget) => void) {
  const chapterMatch = reference.match(/^(.+?)\s+(\d+)/);
  if (!chapterMatch) return;
  const name = chapterMatch[1]?.trim();
  const chapter = Number(chapterMatch[2]);
  const allBooks = [...OLD_TESTAMENT, ...NEW_TESTAMENT];
  const book = allBooks.find((item) => item.name.toLowerCase() === name?.toLowerCase());
  if (book && chapter >= 1 && chapter <= book.chapters) setReader({ book, chapter });
}

function Testament({
  title,
  subtitle,
  books,
  onOpen,
}: {
  title: string;
  subtitle: string;
  books: BibleBook[];
  onOpen: (book: BibleBook) => void;
}) {
  if (!books.length) return null;

  return (
    <section className="pb-7">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {books.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => onOpen(item)}
            className="group rounded-2xl border border-border bg-surface p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-surface-2"
          >
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/9 text-xs font-bold text-cyan">
              {item.name.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase()}
            </span>
            <span className="block truncate text-sm font-semibold text-foreground">{item.name}</span>
            <span className="mt-0.5 block text-[10px] text-muted-foreground">{item.chapters} chapters</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ChapterPicker({ book, onBack, onPick }: { book: BibleBook; onBack: () => void; onPick: (chapter: number) => void }) {
  return (
    <AppShell flush>
      <main className="min-h-full bg-background pb-28">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <button type="button" onClick={onBack} aria-label="Back to books" className="rounded-full p-2 text-secondary-foreground hover:bg-surface-2">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan">King James Version</p>
              <h1 className="truncate font-display text-xl font-semibold">{book.name}</h1>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-xl px-4 pt-5">
          <div className="mb-4 rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/12 to-surface p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan">Choose a chapter</p>
            <p className="mt-1 text-sm text-muted-foreground">{book.name} contains {book.chapters} chapters.</p>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
            {Array.from({ length: book.chapters }, (_, index) => index + 1).map((chapter) => (
              <button
                key={chapter}
                type="button"
                onClick={() => onPick(chapter)}
                className="aspect-square rounded-2xl border border-border bg-surface text-sm font-semibold text-secondary-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-cyan active:scale-95"
              >
                {chapter}
              </button>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function Reader({
  book,
  chapter,
  onBack,
  onChapterChange,
}: {
  book: BibleBook;
  chapter: number;
  onBack: () => void;
  onChapterChange: (chapter: number) => void;
}) {
  const reference = `${book.name} ${chapter}`;
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());
  const [fontSize, setFontSize] = useState(17);

  const passage = useQuery({
    queryKey: ["kjv-passage", reference],
    queryFn: () => fetchKjvPassage(reference),
  });

  const selectedText = useMemo(
    () => passage.data?.verses.filter((verse) => highlighted.has(verse.verse)).map((verse) => `${verse.verse} ${verse.text}`).join(" ") ?? "",
    [passage.data, highlighted],
  );

  async function bookmark() {
    if (!userId) {
      toast.error("Sign in to save Scripture");
      return;
    }
    try {
      await saveScripture(userId, reference);
      await queryClient.invalidateQueries({ queryKey: ["saved-scriptures", userId] });
      toast.success("Saved to your Bible library");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save that chapter");
    }
  }

  async function share() {
    const text = selectedText
      ? `${selectedText}\n\n${reference} — King James Version`
      : `${reference} — King James Version`;
    try {
      if (navigator.share) await navigator.share({ title: reference, text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied");
      }
    } catch {
      // share dismissed
    }
  }

  function toggleVerse(verse: number) {
    setHighlighted((current) => {
      const next = new Set(current);
      if (next.has(verse)) next.delete(verse);
      else next.add(verse);
      return next;
    });
  }

  return (
    <AppShell flush>
      <main className="min-h-full bg-background pb-36">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/92 px-3 py-2.5 pt-[max(0.65rem,env(safe-area-inset-top))] backdrop-blur-xl">
          <div className="mx-auto flex max-w-xl items-center gap-2">
            <button type="button" onClick={onBack} aria-label="Back" className="rounded-full p-2 text-secondary-foreground hover:bg-surface-2">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <h1 className="truncate font-display text-lg font-semibold text-foreground">{reference}</h1>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan">King James Version</p>
            </div>
            <button
              type="button"
              onClick={() => setFontSize((size) => (size >= 21 ? 15 : size + 2))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-xs font-bold text-secondary-foreground"
              aria-label="Change text size"
            >
              Aa
            </button>
          </div>
        </header>

        <section className="mx-auto max-w-xl px-4 pt-5">
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-border bg-surface px-3 py-2">
            <button
              type="button"
              disabled={chapter <= 1}
              onClick={() => chapter > 1 && onChapterChange(chapter - 1)}
              className="flex items-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold text-secondary-foreground disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span className="text-[11px] font-semibold text-muted-foreground">Chapter {chapter} of {book.chapters}</span>
            <button
              type="button"
              disabled={chapter >= book.chapters}
              onClick={() => chapter < book.chapters && onChapterChange(chapter + 1)}
              className="flex items-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold text-secondary-foreground disabled:opacity-30"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {passage.isLoading && <CardSkeleton count={7} height="h-8" />}
          {passage.isError && (
            <EmptyState title="Couldn't load this KJV chapter" description="Check your connection and try again." />
          )}

          {passage.data && (
            <article className="rounded-[28px] border border-border/80 bg-surface px-5 py-6 shadow-sm sm:px-7">
              <div className="mb-6 border-b border-border/70 pb-5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan">The Holy Bible</p>
                <h2 className="mt-1 font-display text-2xl font-semibold">{passage.data.reference}</h2>
                <p className="mt-1 text-[11px] text-muted-foreground">King James Version · Public Domain</p>
              </div>

              <ol className="space-y-1">
                {passage.data.verses.map((verse) => (
                  <li key={`${verse.chapter}:${verse.verse}`}>
                    <button
                      type="button"
                      onClick={() => toggleVerse(verse.verse)}
                      className={cn(
                        "w-full rounded-xl px-2 py-2.5 text-left transition",
                        highlighted.has(verse.verse)
                          ? "bg-warning/18 ring-1 ring-warning/25"
                          : "hover:bg-surface-2",
                      )}
                    >
                      <span className="mr-2 align-super text-[9px] font-bold text-cyan">{verse.verse}</span>
                      <span className="font-serif leading-[1.9] text-secondary-foreground" style={{ fontSize }}>
                        {verse.text}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </article>
          )}

          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={chapter <= 1}
              onClick={() => chapter > 1 && onChapterChange(chapter - 1)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-xs font-semibold disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" /> Previous chapter
            </button>
            <button
              type="button"
              disabled={chapter >= book.chapters}
              onClick={() => chapter < book.chapters && onChapterChange(chapter + 1)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-xs font-semibold text-primary-foreground disabled:opacity-30"
            >
              Next chapter <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <div className="fixed inset-x-0 bottom-[calc(4.9rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-xl px-4">
          <div className="grid grid-cols-4 rounded-[22px] border border-border-strong bg-surface/95 p-1.5 shadow-2xl backdrop-blur-xl">
            <ReaderAction icon={Highlighter} label={highlighted.size ? `${highlighted.size} selected` : "Highlight"} onClick={() => toast("Tap a verse to highlight it")} />
            <ReaderAction icon={Bookmark} label="Save" onClick={() => void bookmark()} />
            <ReaderAction icon={Share2} label="Share" onClick={() => void share()} />
            <ReaderAction
              icon={MessageCircleMore}
              label="Ask Nuru"
              to={{ to: "/ai" as const, search: { contextType: "verse", contextLabel: reference } }}
            />
          </div>
        </div>
      </main>
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
  const content = (
    <>
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/8 text-cyan">
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </span>
      <span className="max-w-[64px] truncate text-[9px] font-semibold text-secondary-foreground">{label}</span>
    </>
  );
  const className = "flex flex-col items-center gap-1 rounded-2xl px-1 py-1.5 transition hover:bg-surface-2";

  if (to) {
    return (
      <Link to={to.to} search={to.search} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function SavedVerses() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const saved = useQuery({
    queryKey: ["saved-scriptures", userId],
    queryFn: () => fetchSavedScriptures(userId!),
    enabled: !!userId,
  });

  async function remove(reference: string) {
    if (!userId) return;
    await removeSavedScripture(userId, reference);
    await queryClient.invalidateQueries({ queryKey: ["saved-scriptures", userId] });
  }

  if (saved.isLoading) return <CardSkeleton count={3} height="h-16" />;

  const rows = saved.data ?? [];
  if (!rows.length) {
    return (
      <EmptyState
        title="Your saved Scripture will live here"
        description="Open a KJV chapter and tap Save when you find something you want to return to."
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="mb-3">
        <h2 className="font-display text-lg font-semibold">Saved Scripture</h2>
        <p className="text-[12px] text-muted-foreground">Verses and chapters you want to revisit.</p>
      </div>
      {rows.map((item) => (
        <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-cyan">
            <Bookmark className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{item.reference}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">King James Version · Saved {new Date(item.created_at).toLocaleDateString()}</p>
          </div>
          <Link
            to="/ai"
            search={{ contextType: "verse", contextLabel: item.reference }}
            aria-label={`Ask Nuru about ${item.reference}`}
            className="rounded-full p-2 text-cyan hover:bg-primary/10"
          >
            <Sparkles className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => void remove(item.reference)}
            aria-label={`Remove ${item.reference}`}
            className="rounded-full p-2 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
