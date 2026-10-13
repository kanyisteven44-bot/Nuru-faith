import { WELCOME_IMAGE_SRCSET, WELCOME_IMAGE_SIZES } from "@/lib/welcomeImage";
import { CoverImage } from "@/components/nuru/CoverImage";
import { NuruMark } from "@/components/nuru/Logo";
import { PwaInstallGuide } from "@/components/nuru/PwaInstallGuide";
import { resolveMedia } from "@/lib/media";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, HandHeart, Sprout, Users } from "lucide-react";

export const Route = createFileRoute("/welcome")({
  ssr: true,
  head: () => ({
    meta: [
      { title: "Welcome — Nuru Faith" },
      {
        name: "description",
        content: "A safe, Christ-centered community for young people. Connect, grow and serve.",
      },
      { name: "robots", content: "index, follow" },
    ],
    // Preload only on the page that actually paints this responsive hero.
    links: [
      { rel: "canonical", href: "https://nurufaith.co.ke/welcome" },
      // Entry and the intro use Inter; discover the display font here when needed.
      { rel: "preload", as: "font", type: "font/woff2",
        href: "/fonts/vEFI2_tTDB4M7-auWDN0ahZJW1gb8tc.woff2",
        crossOrigin: "anonymous" },
      { rel: "preload", as: "image", href: "/photos/alpine-reflections-v1-1024.webp",
        imageSrcSet: WELCOME_IMAGE_SRCSET, imageSizes: WELCOME_IMAGE_SIZES,
        fetchPriority: "high" },
    ],
  }),
  component: Welcome,
});

const VALUES = [
  { icon: Users, title: "Connect", copy: "Find real community" },
  { icon: Sprout, title: "Grow", copy: "Learn and be equipped" },
  { icon: HandHeart, title: "Serve", copy: "Make an eternal impact" },
] as const;

function Welcome() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <CoverImage
        src={resolveMedia("asset:quiet-night")}
        alt=""
        loading="eager"
        fetchPriority="high"
        srcSet={WELCOME_IMAGE_SRCSET}
        sizes={WELCOME_IMAGE_SIZES}
        width={1024}
        height={640}
        className="absolute inset-x-0 bottom-0 h-[55%] w-full object-cover opacity-100"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/45 to-background/25" />

      <div className="relative mx-auto flex min-h-dvh max-w-xl flex-col px-7 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2.5">
            <NuruMark className="h-10 w-10 rounded-xl" />
            <span className="text-[12px] font-bold tracking-[0.12em] text-foreground">
              NURU FAITH
            </span>
          </div>
          <Link
            to="/opening"
            className="inline-flex min-h-11 items-center rounded-full border border-border/70 bg-surface/80 px-3 text-[12px] font-semibold text-secondary-foreground backdrop-blur-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Replay intro
          </Link>
        </div>

        <div className="pt-10">
          <h1 className="font-display text-[34px] leading-[1.15] font-bold tracking-tight">
            Welcome to
            <br />
            Nuru <span className="text-leaf">Faith</span>
          </h1>
          <p className="mt-3 max-w-[17rem] text-sm leading-relaxed text-secondary-foreground">
            A safe, Christ-centered community for young people.
          </p>
        </div>

        <ul className="space-y-4 pt-10">
          {VALUES.map(({ icon: Icon, title, copy }) => (
            <li key={title} className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/12 text-leaf">
                <Icon className="h-5.5 w-5.5" strokeWidth={1.8} />
              </span>
              <span>
                <span className="block font-display text-base font-semibold">{title}</span>
                <span className="block text-[13px] text-muted-foreground">{copy}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-auto space-y-3 pt-12">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground nuru-glow transition-transform hover:brightness-105 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Continue
            <ArrowRight className="h-4.5 w-4.5" />
          </Link>
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-2xl text-sm font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Already part of Nuru? <span className="text-primary">Sign in</span>
          </Link>
          <PwaInstallGuide />
        </div>
      </div>
    </div>
  );
}
