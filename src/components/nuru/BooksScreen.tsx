import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { BooksCatalogue } from "@/components/nuru/BooksCatalogue";

export function BooksScreen() {
  return (
    <AppShell>
      <ScreenHeader title="Christian Books" subtitle="Read. Reflect. Grow." />
      <div className="px-4 pb-8">
        <BooksCatalogue />
      </div>
    </AppShell>
  );
}
