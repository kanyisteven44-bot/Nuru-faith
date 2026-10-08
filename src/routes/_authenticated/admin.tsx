import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AdminV3Screen } from "@/components/nuru/AdminV3Screen";
import type { AdminSectionId } from "@/components/nuru/AdminCommandShell";

const ADMIN_SECTION_IDS = [
  "dashboard",
  "operations",
  "users",
  "churches",
  "content",
  "music",
  "reels",
  "community",
  "moderation",
  "roles",
] as const;

const adminSearchSchema = z.object({
  section: z.enum(ADMIN_SECTION_IDS).optional(),
});

export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: adminSearchSchema,
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
