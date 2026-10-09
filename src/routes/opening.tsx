import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SplashScreen } from "@/components/nuru/SplashScreen";
import { NuruLockup } from "@/components/nuru/Logo";
import { OPENING_IMAGE_PRELOAD } from "@/lib/openingImage";

export const Route = createFileRoute("/opening")({
  head: () => ({
    meta: [
      { title: "Opening preview — Nuru Faith" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [OPENING_IMAGE_PRELOAD],
  }),
  component: OpeningPreview,
});

function OpeningPreview() {
  const [attempt, setAttempt] = useState(0);
  const [playing, setPlaying] = useState(true);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <NuruLockup />
      <h1 className="font-display text-2xl">Your faith. A brighter beginning.</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Preview the opening again, or continue into Nuru Faith.
      </p>
      <button
        type="button"
        className="btn-nuru-primary min-h-11 rounded-full px-6"
        onClick={() => {
          setAttempt((value) => value + 1);
          setPlaying(true);
        }}
      >
        Replay opening
      </button>
      <Link to="/" className="inline-flex min-h-11 items-center text-primary">
        Open Nuru Faith
      </Link>
      {playing && <SplashScreen key={attempt} preview onComplete={() => setPlaying(false)} />}
    </main>
  );
}
