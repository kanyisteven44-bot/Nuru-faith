import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Share2, QrCode } from "lucide-react";
import { useState } from "react";
import { TRANSLATIONS, DEFAULT_TRANSLATION, OLD_TESTAMENT, NEW_TESTAMENT } from "@/lib/bible";
import { EBIBLE_TRANSLATIONS } from "@/lib/bibleCatalog";
import { fetchChapterPassage } from "@/lib/bibleChapter";
import { buildBibleShare, parseVerseRanges, verseRanges } from "@/lib/bibleSharing";
import { NuruLockup } from "@/components/nuru/Logo";
import { optionalString } from "@/lib/searchParams";
import { PassageQr } from "@/components/nuru/PassageQr";
import { useShareSheet } from "@/hooks/useShareSheet";
import { BibleReadAloud } from "@/components/nuru/BibleReadAloud";

const books = [...OLD_TESTAMENT, ...NEW_TESTAMENT];
export const Route = createFileRoute("/passage")({
  ssr: false,
  // Plain checks only: route options ship in the main bundle, so the Bible
  // catalogue lookups (book and translation) happen in the component below.
  validateSearch: (search: Record<string, unknown>) => {
    const chapter = Number(search["chapter"]);
    return {
      book: optionalString(search["book"], 40) ?? "John",
      chapter: Number.isInteger(chapter) && chapter >= 1 && chapter <= 150 ? chapter : 3,
      // Unknown or missing translations fall back to the default in the component.
      translation: optionalString(search["translation"], 100),
      verses: optionalString(search["verses"], 600) ?? "16",
    };
  },
  head: () => ({
    meta: [
      { title: "Shared Scripture — Nuru Faith" },
      { name: "description", content: "Read and share Bible verses with Nuru Faith." },
    ],
  }),
  component: SharedPassage,
});
function SharedPassage() {
  const raw = Route.useSearch();
  const search = {
    ...raw,
    book: books.some((b) => b.name === raw.book) ? raw.book : "John",
    translation: TRANSLATIONS.find((t) => t.id === raw.translation)?.id ?? DEFAULT_TRANSLATION,
  };
  const [qrOpen, setQrOpen] = useState(false);
  const share = useShareSheet();
  const selected = parseVerseRanges(search.verses);
  const reference = `${search.book} ${search.chapter}`;
  const edition = EBIBLE_TRANSLATIONS.find((t) => t.id === search.translation);
  const valid =
    search.chapter <= books.find((b) => b.name === search.book)!.chapters && selected.length > 0;
  const passage = useQuery({
    queryKey: ["scripture-passage", reference, search.translation],
    queryFn: () => fetchChapterPassage(reference, search.translation),
    enabled: valid,
  });
  const rows = (passage.data?.verses ?? []).filter((v) => selected.includes(v.verse));
  const missing = passage.data && rows.length !== selected.length;
  const payload =
    rows.length && !missing && typeof window !== "undefined"
      ? buildBibleShare({
          origin: window.location.origin,
          book: search.book,
          chapter: search.chapter,
          translation: search.translation,
          translationLabel: passage.data!.translation,
          verses: rows,
          selected,
          attribution: edition
            ? `${edition.credit || edition.label} · ${edition.license}\n${edition.sourceUrl}\n${edition.licenseUrl}`
            : undefined,
        })
      : null;
  return (
    <main className="mx-auto min-h-dvh max-w-xl space-y-6 bg-background px-5 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))] text-foreground">
      <Link to="/welcome" aria-label="Nuru Faith">
        <NuruLockup />
      </Link>
      <header>
        <p className="mb-2 text-sm text-muted-foreground">Shared Scripture</p>
        <h1 className="font-display text-3xl">
          {reference}:{verseRanges(selected) || search.verses}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {passage.data?.translation ??
            TRANSLATIONS.find((t) => t.id === search.translation)?.label}
        </p>
      </header>
      {!valid || missing ? (
        <p role="alert" className="rounded-2xl border border-border p-5">
          That selection is not available in this chapter. Open the Bible to choose another passage.
        </p>
      ) : passage.isLoading ? (
        <p role="status" className="py-8">
          Loading your verses…
        </p>
      ) : passage.isError ? (
        <div role="alert" className="space-y-3">
          <p>
            Could not load these verses. The source may be unavailable, or this edition may not
            include the chapter.
          </p>
          <button
            onClick={() => void passage.refetch()}
            className="min-h-11 rounded-full bg-primary px-5 text-primary-foreground"
          >
            Try again
          </button>
        </div>
      ) : (
        <article className="nuru-card space-y-5 p-5">
          {rows.length > 0 &&
            TRANSLATIONS.find((t) => t.id === search.translation)?.language === "English" && (
              <BibleReadAloud verses={rows} label="selected verses" />
            )}
          {rows.map((v) => (
            <p key={v.verse} className="font-serif text-xl leading-relaxed" dir="auto">
              <span className="mr-2 align-super font-sans text-xs font-semibold text-primary">
                {v.verse}
              </span>
              {v.text}
            </p>
          ))}
        </article>
      )}
      {edition && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {edition.credit || edition.label} · {edition.license}.{" "}
          <a
            href={edition.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Source and reuse terms
          </a>
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {payload && (
          <>
            <button
              onClick={() => void share.share(payload)}
              className="flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm text-primary-foreground"
            >
              <Share2 className="h-4 w-4" />
              Share verses
            </button>
            <button
              onClick={() => setQrOpen(true)}
              className="flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm"
            >
              <QrCode className="h-4 w-4" />
              QR code
            </button>
          </>
        )}
        <Link
          to="/bible"
          search={{
            reference: `${reference}:${selected[0] ?? 1}`,
            translation: search.translation,
            verses: search.verses,
          }}
          className="flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm"
        >
          <BookOpen className="h-4 w-4" />
          Read full chapter
        </Link>
      </div>
      {qrOpen && payload && (
        <PassageQr
          payload={payload}
          translation={passage.data!.translation}
          onClose={() => setQrOpen(false)}
        />
      )}
      {share.node}
    </main>
  );
}
