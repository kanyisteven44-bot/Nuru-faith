import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Sparkles } from "lucide-react";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { EmptyState } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({
    meta: [
      { title: "Messages — Nuru Faith" },
      { name: "description", content: "Your Nuru Faith conversations." },
    ],
  }),
  component: MessagesScreen,
});

function MessagesScreen() {
  return (
    <AppShell>
      <ScreenHeader
        title="Messages"
        right={
          <span className="p-1 text-secondary-foreground">
            <Search className="h-5 w-5" />
          </span>
        }
      />

      <div className="px-4 pt-2">
        {/* Direct messaging needs a conversations/participants backend that does
            not exist yet, so this screen states that plainly instead of
            rendering placeholder people. */}
        <EmptyState
          title="Direct messages aren't switched on yet"
          description="One-to-one and group chat needs a messaging backend. Until then, talk with your community in the feed or ask Nuru AI."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                to="/community"
                className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
              >
                Go to Community
              </Link>
              <Link
                to="/ai"
                search={{}}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border-strong bg-surface-2 px-4 text-sm font-semibold text-secondary-foreground"
              >
                <Sparkles className="h-4 w-4 text-cyan" /> Ask Nuru AI
              </Link>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
