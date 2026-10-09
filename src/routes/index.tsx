import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SplashScreen } from "@/components/nuru/SplashScreen";
import { NuruGlyph } from "@/components/nuru/Logo";
import { Link } from "@tanstack/react-router";
import { OPENING_IMAGE_PRELOAD } from "@/lib/openingImage";

const PUBLIC_SITE = "https://nurufaith.co.ke/";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nuru Faith | Christian Community, Bible & Learning App" },
      {
        name: "description",
        content:
          "Nuru Faith connects young Christians through Bible reading, prayer, faith courses, gospel music and meaningful community. Developed by Stephen Kanyi through Vortiqora Technologies.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Nuru Faith — Connect. Grow. Live Your Faith." },
      {
        property: "og:description",
        content: "Discover Nuru Faith: Bible reading, Christian learning, worship and community, created by Stephen Kanyi through Vortiqora Technologies.",
      },
      { property: "og:url", content: PUBLIC_SITE },
      { property: "og:type", content: "website" },
    ],
    // Keep metadata crawlable while making the first visible paint branded.
    links: [{ rel: "canonical", href: PUBLIC_SITE }, OPENING_IMAGE_PRELOAD],
  }),
  component: EntryPage,
});


function EntryPage() {
  const navigate = useNavigate();
  const [destination, setDestination] = useState<"/home" | "/welcome" | null>(null);
  const [introComplete, setIntroComplete] = useState(false);

  // Branded server-rendered entry prevents the old marketing page flashing
  // behind the Gen Z photo splash before JS hydration or during exit.
  useEffect(() => {
    let active = true;
    void supabase.auth.getSession()
      .then(({ data }) => {
        if (active) setDestination(data.session ? "/home" : "/welcome");
      })
      .catch(() => {
        if (active) setDestination("/welcome");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (introComplete && destination) {
      void navigate({ to: destination, replace: true });
    }
  }, [destination, introComplete, navigate]);

  return (
    <>
      <main
        className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#06152a] px-6 text-center text-white"
        aria-label="Welcome to Nuru Faith"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(51,133,207,0.32),transparent_60%),linear-gradient(180deg,#071b34_0%,#041020_100%)]" />
        <div className="relative z-10 flex flex-col items-center">
          <span className="flex h-24 w-24 items-center justify-center rounded-[24px] border border-white/15 bg-white/[.06] shadow-[0_0_60px_rgba(72,191,255,.17)]">
            <NuruGlyph className="h-16 w-16" />
          </span>
          <h1 className="mt-7 text-3xl font-bold tracking-[.18em]">NURU FAITH</h1>
          <p className="mt-4 text-sm tracking-[.16em] text-cyan-100/80">CONNECT · GROW · PURPOSE</p>
          <Link to="/welcome" className="mt-10 inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-200/25 bg-white/10 px-6 text-sm font-semibold text-white hover:bg-white/20">
            Continue to Nuru Faith
          </Link>
        </div>
      </main>
      <SplashScreen initialOnly onComplete={() => setIntroComplete(true)} />
    </>
  );
}
