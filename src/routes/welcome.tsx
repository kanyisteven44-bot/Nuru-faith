import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BookOpen, HeartHandshake, Music2, Sparkles } from "lucide-react";
import { CoverImage } from "@/components/nuru/CoverImage";
import { NuruGlyph, NuruMark } from "@/components/nuru/Logo";
import { completeIntro } from "@/lib/introFlow";

export const Route = createFileRoute("/welcome")({
  ssr: true,
  head: () => ({
    meta: [
      { title: "Welcome — Nuru Faith" },
      { name: "description", content: "Real people. Real faith. A brighter you. Join Nuru Faith to connect, grow and live with purpose." },
      { name: "robots", content: "index, follow" },
    ],
    links: [
      { rel: "canonical", href: "https://nurufaith.co.ke/welcome" },
      { rel: "preload", as: "image", href: "/photos/friends-outdoors.jpg", fetchPriority: "high" },
    ],
  }),
  component: Welcome,
});

const PILLARS = [
  { icon: BookOpen, title: "Faith", detail: "Bible & devotionals" },
  { icon: HeartHandshake, title: "Friendships", detail: "Community & prayer" },
  { icon: Music2, title: "Worship", detail: "Music & media" },
  { icon: Sparkles, title: "Purpose", detail: "Grow & make impact" },
] as const;

/** The only first-entry intro. The app root owns the splash and auth handoff. */
function Welcome() {
  const navigate = useNavigate();
  const [step, setStep] = useState<0 | 1>(0);

  function finish(mode: "login" | "signup") {
    // An interrupted/restricted localStorage never blocks navigating into auth.
    completeIntro();
    void navigate({ to: "/auth", search: { mode }, replace: true });
  }

  return (
    <main
      aria-label="Nuru Faith introduction"
      className="relative isolate min-h-dvh overflow-x-hidden bg-[#050c1c] text-white"
      data-testid="nuru-intro"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <CoverImage
          key={step}
          src={step === 0 ? "/photos/friends-outdoors.jpg" : "/photos/worship-gathering.jpg"}
          alt=""
          width={1024}
          height={800}
          loading={step === 0 ? "eager" : "lazy"}
          fetchPriority={step === 0 ? "high" : "auto"}
          className="nuru-intro-photo absolute inset-0 h-[79%] w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,9,25,0.16)_0%,rgba(4,9,25,0.12)_27%,rgba(5,13,29,0.72)_53%,#050c1c_80%)]" />
        <div className="absolute -left-24 top-[19%] h-64 w-64 rounded-full bg-indigo-400/25 blur-[90px]" />
        <div className="absolute -right-20 top-[38%] h-60 w-60 rounded-full bg-fuchsia-400/20 blur-[85px]" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[radial-gradient(ellipse_at_55%_100%,rgba(30,79,133,0.36),transparent_65%)]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-[max(1.2rem,env(safe-area-inset-bottom))] pt-[max(1.2rem,env(safe-area-inset-top))] min-[375px]:px-7">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2.5">
            <NuruMark className="h-11 w-11 shrink-0 rounded-2xl border border-cyan-200/20" />
            <span className="text-[12px] font-bold tracking-[0.19em] text-white">NURU FAITH</span>
          </span>
          <button
            type="button"
            onClick={() => finish("login")}
            className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-white/25 bg-[#0a1630]/55 px-4 text-xs font-semibold text-white/90 backdrop-blur-md hover:border-white/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
          >
            Skip intro
          </button>
        </div>

        <div className="mt-5 flex items-center gap-1.5" role="group" aria-label="Introduction progress">
          <span aria-current={step === 0 ? "step" : undefined} className={`h-1 rounded-full transition-all duration-300 ${step === 0 ? "w-12 bg-cyan-200" : "w-5 bg-white/30"}`} />
          <span aria-current={step === 1 ? "step" : undefined} className={`h-1 rounded-full transition-all duration-300 ${step === 1 ? "w-12 bg-cyan-200" : "w-5 bg-white/30"}`} />
          <span className="ml-2 text-[11px] font-semibold tracking-[0.16em] text-white/85">0{step + 1} / 02</span>
        </div>

        <div className="flex min-h-[min(34vh,16rem)] grow items-center justify-center py-6" aria-hidden="true">
          <div className="relative grid h-24 w-24 place-items-center rounded-full border border-white/20 bg-[#0b1a36]/20 backdrop-blur-[3px]">
            <span className="nuru-intro-halo absolute inset-[-12px] rounded-full border border-cyan-200/30" />
            <NuruGlyph className="h-16 w-16 drop-shadow-[0_0_20px_rgba(111,207,255,0.60)]" />
          </div>
        </div>

        <div key={step} className="nuru-intro-reveal relative mt-auto rounded-[1.8rem] border border-white/15 bg-[#09162a]/75 px-5 pb-5 pt-6 shadow-[0_18px_65px_rgba(0,0,0,0.35)] backdrop-blur-xl min-[375px]:px-6" aria-live="polite">
          {step === 0 ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-200">A brighter beginning</p>
              <h1 className="mt-3 font-sans text-[clamp(1.8rem,8.2vw,3rem)] font-extrabold leading-[1.08] tracking-[-0.035em]">
                Real people.<br />
                Real faith.<br />
                <span className="bg-gradient-to-r from-cyan-200 via-blue-200 to-fuchsia-200 bg-clip-text text-transparent">A brighter you.</span>
              </h1>
              <p className="mt-3 max-w-sm text-[13px] leading-6 text-slate-200 min-[375px]:text-sm">
                A place to belong, discover your purpose and grow closer to God—together.
              </p>
              <p className="mt-3 text-[11px] font-semibold tracking-[0.12em] text-white/70">GROW · CONNECT · LEAD · IMPACT</p>
            </>
          ) : (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-200">Your journey, your community</p>
              <h1 className="mt-2 font-sans text-[clamp(1.65rem,7.2vw,2.65rem)] font-extrabold leading-[1.15] tracking-[-0.03em]">
                You are loved.<br />You are called.
              </h1>
              <p className="mt-2 text-[13px] leading-5 text-slate-200">Faith that grows with you. People who walk beside you.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {PILLARS.map(({ icon: Icon, title, detail }) => (
                  <div key={title} className="flex min-w-0 items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-2.5">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" aria-hidden="true" />
                    <div className="min-w-0">
                      <span className="block text-xs font-bold">{title}</span>
                      <span className="block text-[10px] leading-4 text-slate-300">{detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => step === 0 ? setStep(1) : finish("signup")}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#72cfff] via-[#93caff] to-[#cdb2ff] px-5 text-sm font-bold text-[#07152b] shadow-[0_8px_25px_rgba(74,163,240,0.28)] transition-transform hover:brightness-105 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {step === 0 ? "Continue" : "Get started"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <Link
            to="/auth"
            search={{ mode: "login" }}
            onClick={() => completeIntro()}
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-2xl text-xs font-semibold text-white/85 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
          >
            Already part of Nuru? <span className="text-cyan-200">Sign in</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
