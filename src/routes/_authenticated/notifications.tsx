import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { fetchNotifications, markNotificationRead } from "@/services/content";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { CardSkeleton, EmptyState, IconTile } from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Nuru Faith" },
      {
        name: "description",
        content: "Prayer replies, church announcements and community activity.",
      },
      { property: "og:title", content: "Notifications — Nuru Faith" },
      { property: "og:description", content: "Prayer replies, announcements and activity." },
    ],
  }),
  component: NotificationsScreen,
});

function NotificationsScreen() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => fetchNotifications(userId!),
    enabled: !!userId,
  });

  return (
    <AppShell>
      <ScreenHeader title="Notifications" subtitle="What's happening around you" />
      <div className="space-y-2 px-4 py-3">
        {isLoading && <CardSkeleton count={4} height="h-16" />}
        {data?.length === 0 && (
          <EmptyState
            title="All clear"
            description="You're up to date. New activity shows up here."
          />
        )}
        {(data ?? []).map((n) => (
          <button
            key={n.id}
            onClick={async () => {
              if (!n.read) {
                await markNotificationRead(n.id);
                await queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
              }
            }}
            className={cn(
              "nuru-card flex w-full items-start gap-3 p-4 text-left transition-colors",
              !n.read && "border-primary/45",
            )}
          >
            <IconTile icon={Bell} tone="brand" size="sm" className="mt-0.5 shrink-0" />
            <span className="flex-1">
              <span className="block text-sm font-semibold">{n.title}</span>
              {n.body && <span className="block text-xs text-secondary-foreground">{n.body}</span>}
              <span className="mt-1 block text-[11px] text-muted-foreground">
                {timeAgo(n.created_at)}
              </span>
            </span>
            {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
          </button>
        ))}
      </div>
    </AppShell>
  );
}
