import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { NuruLogo } from "@/components/nuru/Logo";
import hero from "@/assets/mountain-dawn.jpg";

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

function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="nuru-screen relative overflow-hidden">
      <img
        src={hero}
        alt=""
        width={1024}
        height={640}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#000814]/12 via-[#000814]/18 to-[#000814]/96" />

      <div className="relative mx-auto flex min-h-dvh flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <NuruLogo compact />
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="rounded-full px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip
          </Link>
        </div>

        <div className="mt-auto pb-7">
          <h1 className="font-serif text-[38px] leading-[1.02] font-bold tracking-tight text-white drop-shadow-lg">
            Faith for
            <br />
            Real Life.
          </h1>
          <p className="mt-3 max-w-[17rem] text-sm leading-relaxed text-white/78">
            Grow. Connect. Belong.
          </p>
          <button
            type="button"
            onClick={() => void navigate({ to: "/auth", search: { mode: "signup" } })}
            aria-label="Continue to sign in"
            className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-slate-950 shadow-xl transition-transform active:scale-[0.98]"
          >
            Get Started <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
