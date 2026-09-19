import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, HandHeart, Sprout, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import forest from "@/assets/quiet-night.jpg";

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
      <img
        src={forest}
        alt=""
        width={1024}
        height={640}
        className="absolute inset-x-0 bottom-0 h-[55%] w-full object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/85 to-background/55" />

      <div className="relative mx-auto flex min-h-dvh max-w-xl flex-col px-7 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="flex justify-end">
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="rounded-full px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip
          </Link>
        </div>

        <div className="pt-10">
          <h1 className="font-display text-[34px] leading-[1.15] font-bold tracking-tight">
            Welcome to
            <br />
            Nuru <span className="text-cyan">Faith</span>
          </h1>
          <p className="mt-3 max-w-[17rem] text-sm leading-relaxed text-secondary-foreground">
            A safe, Christ-centered community for young people.
          </p>
        </div>

        <ul className="space-y-4 pt-10">
          {VALUES.map(({ icon: Icon, title, copy }) => (
            <li key={title} className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/12 text-cyan">
                <Icon className="h-5.5 w-5.5" strokeWidth={1.8} />
              </span>
              <span>
                <span className="block font-display text-base font-semibold">{title}</span>
                <span className="block text-[13px] text-muted-foreground">{copy}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-center justify-between pt-12">
          <span className="flex items-center gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === 0 ? "w-5 bg-cyan" : "w-1.5 bg-surface-2",
                )}
              />
            ))}
          </span>
          <button
            type="button"
            onClick={() => void navigate({ to: "/auth", search: { mode: "signup" } })}
            aria-label="Continue to sign in"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground nuru-glow transition-transform active:scale-95"
          >
            <ArrowRight className="h-5.5 w-5.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
