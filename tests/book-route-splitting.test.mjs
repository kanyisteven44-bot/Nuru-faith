import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("book catalogue and reader only load when their routes are visited", () => {
  const catalogue = read("src/routes/books.index.tsx");
  const reader = read("src/routes/books.$bookId.tsx");
  assert.match(catalogue, /lazyRouteComponent\(/);
  assert.match(catalogue, /import\("@\/components\/nuru\/BooksScreen"\)/);
  assert.match(reader, /lazyRouteComponent\(/);
  assert.match(reader, /import\("@\/components\/nuru\/BookReaderRoute"\)/);
  assert.doesNotMatch(catalogue, /import \{ BooksCatalogue \}/);
  assert.doesNotMatch(reader, /import books from/);
});

test("book-specific SEO titles still cover every edition", () => {
  const full = JSON.parse(read("src/data/christianBooks.json"));
  const headings = JSON.parse(read("src/data/bookHeadings.json"));
  assert.deepEqual(
    headings.map(({ id, title }) => ({ id, title })),
    full.map(({ id, title }) => ({ id, title })),
  );
  assert.match(read("src/routes/books.$bookId.tsx"), /bookHeadings.find/);
  const view = read("src/components/nuru/BookReaderRoute.tsx");
  assert.match(view, /useParams\(\{ from: "\/books\/\$bookId" \}\)/);
  assert.match(view, /fetchBookSection/);
  assert.match(view, /fetchBookDownload/);
});
