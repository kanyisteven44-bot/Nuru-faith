import { createFileRoute, Link } from "@tanstack/react-router";
import { YouTubeAccountAccess } from "@/components/youtube/YouTubeAccountAccess";
import { NuruLockup } from "@/components/nuru/Logo";

export const Route = createFileRoute("/youtube-account")({
  head: () => ({ meta: [{ title: "Your YouTube account — Nuru Faith" }] }),
  component: YouTubeAccountPage,
});
function YouTubeAccountPage() {
  return (
    <main className="min-h-dvh bg-background px-5 py-10 text-foreground">
      <div className="mx-auto max-w-xl">
        <NuruLockup />
        <div className="mt-8">
          <YouTubeAccountAccess />
        </div>
        <Link to="/music" className="mt-6 inline-flex min-h-11 items-center text-sm text-primary">
          Back to Nuru music
        </Link>
      </div>
    </main>
  );
}
