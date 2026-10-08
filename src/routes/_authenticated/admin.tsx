import { createFileRoute } from "@tanstack/react-router";
import { AdminV3Screen } from "@/components/nuru/AdminV3Screen";
import type { AdminSectionId } from "@/components/nuru/AdminCommandShell";
import { optionalOneOf } from "@/lib/searchParams";

const ADMIN_SECTION_IDS = [
  "dashboard",
  "users",
  "churches",
  "content",
  "music",
  "reels",
  "community",
  "moderation",
  "roles",
] as const;

export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { section?: (typeof ADMIN_SECTION_IDS)[number] | undefined } => ({
    section: optionalOneOf(search["section"], ADMIN_SECTION_IDS),
  }),
  head: () => ({
    meta: [
      { title: "Nuru Faith Admin" },
      {
        name: "description",
        content:
          "Nuru Faith command center for people, churches, content, moderation and platform operations.",
      },
    ],
  }),
  component: AdminRoute,
});

function AdminRoute() {
  const search = Route.useSearch();
  return <AdminV3Screen initialSection={(search.section ?? "dashboard") as AdminSectionId} />;
}
