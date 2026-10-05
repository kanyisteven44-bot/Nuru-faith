import { createFileRoute } from "@tanstack/react-router";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { BooksCatalogue } from "@/components/nuru/BooksCatalogue";

export const Route = createFileRoute("/books/")({
  head: () => ({ meta: [{ title: "Christian Books — Nuru Faith" }] }),
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
