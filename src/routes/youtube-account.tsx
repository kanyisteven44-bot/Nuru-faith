import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/youtube-account")({
  beforeLoad: () => {
    throw redirect({ to: "/music" });
  },
});
