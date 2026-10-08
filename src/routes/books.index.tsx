import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { BooksCatalogue } from "@/components/nuru/BooksCatalogue";

export const Route = createFileRoute("/books/")({
  head: () => ({
    meta: [
      { title: "Christian Books & Faith Reading | Nuru Faith" },
      {
        name: "description",
        content:
          "Explore Christian books and faith-centered reading on discipleship, prayer, relationships, purpose and spiritual growth with Nuru Faith.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Christian Books & Faith Reading | Nuru Faith" },
      {
        property: "og:description",
        content: "Explore Christian books and faith-centered reading for spiritual growth.",
      },
      { property: "og:url", content: "https://nurufaith.co.ke/books/" },
    ],
    links: [{ rel: "canonical", href: "https://nurufaith.co.ke/books/" }],
  }),
  component: BooksScreen,
});

function BooksScreen() {
  return (
    <AppShell>
      <ScreenHeader title="Christian Books" subtitle="Read. Reflect. Grow." />
      <div className="px-4 pb-8">
        <BooksCatalogue />
      </div>
    </AppShell>
  );
}
