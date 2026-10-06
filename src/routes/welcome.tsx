import { CoverImage } from "@/components/nuru/CoverImage";
import { resolveMedia } from "@/lib/media";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, HandHeart, Sprout, Users } from "lucide-react";

export const Route = createFileRoute("/welcome")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Welcome — Nuru Faith" },
      {
        name: "description",
        content: "A safe, Christ-centered community for young people. Connect, grow and serve.",
      },
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
  const navigate = useNavigate();

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <CoverImage
        src={resolveMedia("asset:quiet-night")}
        alt=""
        width={1024}
        height={640}
        className="absolute inset-x-0 bottom-0 h-[55%] w-full object-cover opacity-100"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/45 to-background/25" />

      <div className="relative mx-auto flex min-h-dvh max-w-xl flex-col px-7 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <Link
            to="/opening"
            className="inline-flex min-h-11 items-center rounded-full px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Replay opening
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Nuru Faith
          </span>
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

        <div className="mt-auto pt-12">
          <button
            type="button"
            onClick={() => void navigate({ to: "/auth", search: { mode: "signup" } })}
            className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground nuru-glow transition-transform active:scale-[0.99]"
          >
            Continue
            <ArrowRight className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
