import { Link } from "@tanstack/react-router";
import { BookCover } from "./BookCover";
import { useState } from "react";
import { BookOpen, Download, ExternalLink, Search } from "lucide-react";
import books from "@/data/christianBooks.json";

const categories = [...new Set(books.map((book) => book.category))].sort();

export function BooksCatalogue() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState(24);
  const normalized = query.trim().toLowerCase();
  const filtered = books.filter(
    (book) =>
      (!category || category === book.category) &&
      (!normalized ||
        `${book.title} ${book.author} ${book.category}`.toLowerCase().includes(normalized)),
  );

  return (
    <section className="mt-5 space-y-5" aria-label="Christian books">
      <div className="nuru-card border-primary/20 bg-primary/5 p-5">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">
          The reading room
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold">Words for a deeper faith.</h2>
        <p className="mt-2 text-sm text-ink-2">
          {books.length} English books: Christian classics, prayer, Bible study, sermons and church
          history.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-ink-2">
          Read inside Nuru or open the archive edition and its download formats. Covers belong to
          the archive edition; original printed covers are not available for every book. These
          historical works represent different traditions; inclusion is not a doctrinal endorsement.
          Gutenberg lists these editions as public domain in the USA; check its rights information
          for your country.
        </p>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-3" />
        <input
          className="input-nuru pl-10"
          aria-label="Search books"
          placeholder="Search title, author or subject…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setLimit(24);
          }}
        />
      </div>
      <label className="flex items-center gap-3 text-sm">
        Subject
        <select
          className="input-nuru flex-1"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setLimit(24);
          }}
        >
          <option value="">All subjects</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <p className="text-xs text-ink-2" role="status">
        {filtered.length} books found · Showing {Math.min(limit, filtered.length)}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.slice(0, limit).map((book) => (
          <article key={book.id} className="nuru-card flex flex-col p-4">
            <div className="flex items-start gap-3">
              <Link
                to="/books/$bookId"
                params={{ bookId: String(book.id) }}
                aria-label={`Open ${book.title}`}
                className="shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
              >
                <BookCover
                  id={book.id}
                  title={book.title}
                  author={book.author}
                  className="w-24 sm:w-28"
                />
              </Link>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-wide text-primary uppercase">
                  {book.category}
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold leading-snug">
                  {book.title}
                </h3>
                <p className="mt-2 text-sm text-ink-2">{book.author}</p>
                <p className="mt-3 text-[11px] text-ink-3">Archive edition · #{book.id}</p>
              </div>
            </div>
            <div className="mt-auto pt-4">
              <div className="flex gap-2">
                <Link
                  to="/books/$bookId"
                  params={{ bookId: String(book.id) }}
                  aria-label={`Read ${book.title} in Nuru`}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <BookOpen className="h-4 w-4" />
                  Read in Nuru
                </Link>
                <a
                  href={book.sourceUrl + "#download_options"}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open download formats for ${book.title} (opens new tab)`}
                  className="flex min-h-11 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Download className="h-4 w-4" />
                  Formats
                </a>
              </div>
              <a
                href={book.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-8 items-center gap-1 text-xs text-ink-2 underline"
              >
                Source & formats
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </article>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-ink-2">
          No books match. Try another author or choose all subjects.
        </p>
      )}
      {limit < filtered.length && (
        <button
          type="button"
          onClick={() => setLimit((value) => value + 24)}
          className="min-h-11 w-full rounded-full border border-primary/30 px-5 text-sm font-semibold text-primary"
        >
          Show more books ({filtered.length - limit} remaining)
        </button>
      )}
    </section>
  );
}
