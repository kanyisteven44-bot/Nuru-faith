import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HandHeart, MapPin } from "lucide-react";
import { toast } from "sonner";
import { fetchServeOpportunities } from "@/services/content";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import {
  CardSkeleton,
  Chip,
  EmptyState,
  GradientButton,
  IconTile,
} from "@/components/nuru/Primitives";

export const Route = createFileRoute("/_authenticated/serve")({
  head: () => ({
    meta: [
      { title: "Serve — Nuru Faith" },
      {
        name: "description",
        content: "Volunteer opportunities and ministry roles in churches near you.",
      },
      { property: "og:title", content: "Serve — Nuru Faith" },
      { property: "og:description", content: "Volunteer and ministry opportunities." },
    ],
  }),
  component: ServeScreen,
});

function ServeScreen() {
  const { data, isLoading } = useQuery({ queryKey: ["serve"], queryFn: fetchServeOpportunities });

  return (
    <AppShell>
      <ScreenHeader title="Serve" subtitle="Faith becomes real in service" />

      <div className="space-y-3 px-4 py-3">
        {isLoading && <CardSkeleton count={3} height="h-28" />}
        {data?.length === 0 && (
          <EmptyState
            title="No opportunities yet"
            description="Churches will post ways to serve here."
          />
        )}
        {(data ?? []).map((o) => (
          <article key={o.id} className="nuru-card p-4">
            <div className="flex items-start gap-3">
              <IconTile icon={HandHeart} tone="growth" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{o.title}</p>
                {o.churches?.name && <p className="text-[11px] text-cyan">{o.churches.name}</p>}
                {o.description && (
                  <p className="mt-1 text-xs text-secondary-foreground">{o.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {o.category && <Chip tone="brand">{o.category}</Chip>}
                  {o.requirements && <Chip>{o.requirements}</Chip>}
                </div>
                {o.location && (
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {o.location}
                  </p>
                )}
              </div>
            </div>
            <GradientButton
              className="mt-3 w-full"
              onClick={() => toast.success("Your church will reach out about this role")}
            >
              I'm interested
            </GradientButton>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
