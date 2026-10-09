import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { NuruGlyph } from "@/components/nuru/Logo";
import { PublicSeoLanding } from "@/components/nuru/PublicSeoLanding";

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
    // The public SEO landing never displays the Welcome landscape. Do not
    // prefetch its large image here and compete with first-render CSS/fonts.
    links: [{ rel: "canonical", href: PUBLIC_SITE }],
  }),
  component: EntryPage,
});

const SPLASH_MS = 2200;

const features = [
  {
    title: "Read the Bible",
    text: "Find Scripture, explore verses, and build a consistent Bible-reading habit.",
  },
  {
    title: "Courses and devotions",
    text: "Grow through Christian courses, devotionals and guided learning series.",
  },
  {
    title: "Prayer and mentorship",
    text: "Build a prayer rhythm and find support through faith-centered relationships.",
  },
  {
    title: "Worship and gospel music",
    text: "Explore Christian music, artists and worship content within the Nuru experience.",
  },
  {
    title: "Community and messaging",
    text: "Connect with people and groups around shared Christian values.",
  },
  {
    title: "Nuru AI",
    text: "Explore faith-related questions alongside Bible reading and structured learning.",
  },
];

function EntryPage() {
  const navigate = useNavigate();
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    let active = true;
    let left = false;
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    // Standalone installations retain the familiar splash -> app launch flow.
    // Search engines and logged-out browser visitors get a REAL public
    // homepage, not a noindex loading screen or a client-only hidden section.
    if (installed) setStandalone(true);

    const go = (to: "/home" | "/welcome") => {
      if (!active || left) return;
      left = true;
      void navigate({ to, replace: true });
    };
    const timer = installed ? window.setTimeout(() => go("/welcome"), SPLASH_MS) : null;

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (timer !== null) clearTimeout(timer);
        if (data.session) go("/home");
        else if (installed) go("/welcome");
      })
      .catch(() => {
        if (timer !== null) clearTimeout(timer);
        if (installed) go("/welcome");
      });

    return () => {
      active = false;
      if (timer !== null) clearTimeout(timer);
    };
  }, [navigate]);

  if (!standalone) {
    return (
      <PublicSeoLanding
        eyebrow="Faith • Learning • Community"
        title="Nuru Faith — Connect. Grow. Live Your Faith."
        intro="A Christian community and learning platform for the next generation. Read Scripture, pray, explore courses and devotions, discover worship, and connect with others through Nuru Faith."
        canonical={PUBLIC_SITE}
        description="Nuru Faith is a Christian community and learning app, developed by Stephen Kanyi through Vortiqora Technologies in Kenya."
        features={features}
        sections={[
          {
            title: "Built for a generation growing in faith",
            text: "Nuru Faith brings Bible reading, guided learning, prayer, worship and community together. Its goal is to help young people build meaningful habits and relationships, rather than simply scroll through more content.",
          },
          {
            title: "Meet Stephen Kanyi, the founder",
            text: "Stephen Kanyi began developing Nuru Faith at age 18 through Vortiqora Technologies. Inspired by the needs of young people and the possibilities of technology, he is building Nuru Faith with a vision for stronger Christian learning and community in Kenya, across Africa and beyond.",
          },
        ]}
        faq={[
          {
            question: "What is Nuru Faith?",
            answer: "Nuru Faith is a faith-centered platform for Bible reading, Christian courses, devotions, worship, prayer, mentorship and community.",
          },
          {
            question: "Who founded Nuru Faith?",
            answer: "Stephen Kanyi began developing Nuru Faith at age 18 through Vortiqora Technologies in Kenya.",
          },
          {
            question: "How can I try Nuru Faith?",
            answer: "Choose Join Nuru to create an account. Existing members can sign in from the Nuru Faith welcome page.",
          },
        ]}
        related={[
          { href: "/about#founder", label: "Our founder" },
          { href: "/bible-app-for-young-people", label: "Bible reading" },
          { href: "/christian-community-app", label: "Christian community" },
          { href: "/welcome", label: "Open Nuru Faith" },
        ]}
      />
    );
  }

  return (
    <main
      className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#06152A] px-6 text-center text-white"
      aria-label="Opening Nuru Faith"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_32%,rgba(54,139,207,0.30),transparent_56%),linear-gradient(180deg,#071B34_0%,#040C19_100%)]"
      />
      <div aria-hidden="true" className="absolute top-[28%] h-44 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative z-10 flex flex-col items-center">
        <span className="flex h-28 w-28 items-center justify-center rounded-[30px] border border-white/15 bg-white/[0.05] shadow-[0_0_65px_rgba(72,191,255,0.18)]">
          <NuruGlyph className="h-20 w-20" />
        </span>
        <span className="mt-6 text-[30px] font-bold tracking-[0.22em]">NURU</span>
        <span className="mt-1 text-[12px] font-semibold tracking-[0.5em] text-cyan-100/90">FAITH</span>
        <p role="status" className="mt-9 text-[13px] text-cyan-50/75">
          Preparing your home…
        </p>
        <div className="mt-3 h-1 w-32 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
          <span className="block h-full w-1/2 animate-pulse rounded-full bg-[#55C8FF]" />
        </div>
      </div>
      <p className="absolute inset-x-6 bottom-[max(1.75rem,env(safe-area-inset-bottom))] text-[11px] tracking-[0.12em] text-white/45">
        FAITH · COMMUNITY · PURPOSE
      </p>
    </main>
  );
}
