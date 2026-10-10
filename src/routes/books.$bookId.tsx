import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import bookHeadings from "@/data/bookHeadings.json";

export const Route = createFileRoute("/books/$bookId")({
  head: ({ params }) => ({
    meta: [
      {
        title: `${bookHeadings.find((book) => String(book.id) === params.bookId)?.title ?? "Book reader"} — Nuru Faith`,
      },
    ],
  }),
  component: lazyRouteComponent(
    () => import("@/components/nuru/BookReaderRoute"),
    "BookReaderRoute",
  ),
});
