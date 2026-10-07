import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpenCheck,
  CheckCircle2,
  Church,
  Clapperboard,
  FileCheck2,
  Home,
  LayoutDashboard,
  MessageCircle,
  Music2,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  WandSparkles,
} from "lucide-react";
import { NuruMark } from "@/components/nuru/Logo";

export const Route = createFileRoute("/_authenticated/admin-design-options")({
  head: () => ({
    meta: [
      { title: "Admin UI Options — Nuru Faith" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDesignOptions,
});

type OptionId = 1 | 2 | 3 | 4 | 5;

const options: Array<{
  id: OptionId;
  name: string;
  subtitle: string;
  bestFor: string;
}> = [
  {
    id: 1,
    name: "Command Center",
    subtitle: "Structured, powerful, familiar",
    bestFor: "Best all-round admin experience",
  },
  {
    id: 2,
    name: "Bento Control",
    subtitle: "Modern, visual, modular",
    bestFor: "Fast scanning and Gen Z visual energy",
  },
  {
    id: 3,
    name: "Precision Console",
    subtitle: "Dense, focused, operational",
    bestFor: "Heavy moderation and content operations",
  },
  {
    id: 4,
    name: "Community Pulse",
    subtitle: "People-first, warm, network-focused",
    bestFor: "Churches, groups, mentors and community",
  },
  {
    id: 5,
    name: "Executive Glass",
    subtitle: "Premium, spacious, presentation-ready",
    bestFor: "Founder, leadership and partner demos",
  },
];

function AdminDesignOptions() {
  const [selected, setSelected] = useState<OptionId>(1);
  const active = options.find((option) => option.id === selected) ?? options[0]!;

  return (
    <div className="min-h-dvh bg-[#020a13] text-slate-100">
      <header className="sticky top-0 z-50 border-b border-[#13334b] bg-[#03101d]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1700px] items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/admin" search={{ section: "dashboard" }} className="flex items-center gap-3">
            <NuruMark className="h-10 w-10" />
            <span>
              <span className="block font-display text-base font-semibold text-white">Nuru Admin UI Lab</span>
              <span className="block text-[10px] text-slate-500">5 directions · preview only</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold text-amber-200 sm:inline-flex">
              No live admin functions changed
            </span>
            <Link
              to="/admin"
              search={{ section: "dashboard" }}
              className="rounded-xl border border-[#234b68] bg-[#071727] px-3 py-2 text-xs font-semibold text-slate-200"
            >
              Back to current admin
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6">
        <section className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">Admin redesign</p>
          <h1 className="mt-2 max-w-4xl font-display text-3xl font-semibold text-white sm:text-5xl">
            Choose the direction before we replace the current admin UI.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
            I kept Nuru's dark navy, cyan glow and faith-tech identity, but each option changes the
            information hierarchy, density and feel of the dashboard.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {options.map((option) => {
            const isActive = selected === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelected(option.id)}
                className={[
                  "rounded-2xl border p-4 text-left transition",
                  isActive
                    ? "border-cyan-400/60 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.12)]"
                    : "border-[#153b5c] bg-[#061522] hover:border-cyan-400/30 hover:bg-[#081a2a]",
                ].join(" ")}
              >
                <div className="flex items-center gap-2">
                  <span className={[
                    "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold",
                    isActive ? "bg-cyan-400 text-[#02101b]" : "bg-[#0b2539] text-cyan-300",
                  ].join(" ")}>
                    {option.id}
                  </span>
                  <span className="text-sm font-semibold text-white">{option.name}</span>
                </div>
                <p className="mt-3 text-xs text-slate-400">{option.subtitle}</p>
                <p className="mt-2 text-[10px] text-slate-500">{option.bestFor}</p>
              </button>
            );
          })}
        </section>

        <section className="mt-6 overflow-hidden rounded-[28px] border border-[#173f5d] bg-[#030d18] shadow-2xl">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#12314a] bg-[#051421] px-5 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">
                Option {active.id}
              </p>
              <h2 className="font-display text-xl font-semibold text-white">{active.name}</h2>
            </div>
            <span className="ml-auto rounded-full border border-[#244e69] bg-[#081b2a] px-3 py-1 text-[10px] text-slate-400">
              Preview data only
            </span>
          </div>

          {selected === 1 && <CommandCenterPreview />}
          {selected === 2 && <BentoPreview />}
          {selected === 3 && <PrecisionPreview />}
          {selected === 4 && <CommunityPreview />}
          {selected === 5 && <ExecutivePreview />}
        </section>

        <section className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">
          <p className="text-sm font-semibold text-white">Your next step</p>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Choose <strong className="text-cyan-200">1, 2, 3, 4 or 5</strong>. I will then rebuild the real
            Admin Dashboard, Users, Churches, Content, Music, Reels, Community, Reports and Roles pages
            around that direction without removing the working admin functions.
          </p>
        </section>
      </main>
    </div>
  );
}

function PreviewShell({
  children,
  compact = false,
  topOnly = false,
}: {
  children: ReactNode;
  compact?: boolean;
  topOnly?: boolean;
}) {
  return (
    <div className={["min-h-[760px] lg:flex", compact ? "text-[13px]" : ""].join(" ")}>
      {!topOnly && (
        <aside className="hidden w-56 shrink-0 border-r border-[#14334b] bg-[#03101d] p-4 lg:block">
          <div className="flex items-center gap-3">
            <NuruMark className="h-10 w-10" />
            <div>
              <p className="font-display font-semibold text-white">Nuru Admin</p>
              <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-300">Command</p>
            </div>
          </div>
          <nav className="mt-7 space-y-1.5">
            {[
              [Home, "Dashboard"],
              [Users, "Users"],
              [Church, "Churches"],
              [BookOpenCheck, "Content"],
              [Music2, "Music"],
              [Clapperboard, "Reels"],
              [MessageCircle, "Community"],
              [ShieldCheck, "Reports"],
            ].map(([Icon, label], index) => {
              const Comp = Icon as typeof Home;
              return (
                <div
                  key={String(label)}
                  className={[
                    "flex min-h-10 items-center gap-3 rounded-xl px-3 text-xs font-semibold",
                    index === 0 ? "bg-cyan-400/10 text-white" : "text-slate-500",
                  ].join(" ")}
                >
                  <Comp className={index === 0 ? "h-4 w-4 text-cyan-300" : "h-4 w-4"} />
                  {String(label)}
                </div>
              );
            })}
          </nav>
        </aside>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex min-h-16 items-center gap-3 border-b border-[#14334b] bg-[#04111e] px-4 sm:px-6">
          <div>
            <p className="text-sm font-semibold text-white">Nuru Faith Admin</p>
            <p className="text-[9px] text-slate-500">Super Admin workspace</p>
          </div>
          <div className="mx-auto hidden w-full max-w-md md:block">
            <div className="flex min-h-9 items-center gap-2 rounded-full border border-[#1c4664] bg-[#071827] px-3 text-[10px] text-slate-500">
              <Search className="h-3.5 w-3.5" /> Search anything…
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1c425d] bg-[#071827]">
            <Bell className="h-4 w-4 text-slate-400" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function CommandCenterPreview() {
  return (
    <PreviewShell>
      <div className="space-y-4 p-4 sm:p-6">
        <section className="relative overflow-hidden rounded-3xl border border-cyan-400/25 bg-[#071727] p-6">
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">Good morning</p>
          <h3 className="mt-2 font-display text-3xl font-semibold text-white">Run Nuru from one command center.</h3>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400">
            Strong hierarchy, clear alerts, operational cards and enough space for every admin function.
          </p>
        </section>
        <MetricStrip />
        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr_0.75fr]">
          <Panel title="Pending approvals" icon={FileCheck2}>
            <Rows />
          </Panel>
          <Panel title="Recent activity" icon={Activity}>
            <MiniActivity />
          </Panel>
          <div className="space-y-4">
            <Panel title="Quick actions" icon={Sparkles}>
              <QuickActions />
            </Panel>
            <Panel title="System status" icon={CheckCircle2}>
              <StatusRows />
            </Panel>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

function BentoPreview() {
  return (
    <PreviewShell topOnly>
      <div className="p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-violet-300">Nuru Control</p>
            <h3 className="mt-1 font-display text-3xl font-semibold text-white">Everything important, at a glance.</h3>
          </div>
          <button className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-[#02101b]">+ Quick action</button>
        </div>
        <div className="grid auto-rows-[150px] gap-3 md:grid-cols-4">
          <BentoCard className="md:col-span-2 md:row-span-2" title="Platform pulse" tone="cyan">
            <div className="mt-auto">
              <p className="font-display text-5xl font-semibold text-white">Live</p>
              <p className="mt-2 max-w-sm text-xs leading-5 text-slate-400">Users, engagement, reports and growth combined into one visual pulse.</p>
            </div>
          </BentoCard>
          <BentoCard title="Users" tone="blue"><BigDash /></BentoCard>
          <BentoCard title="Pending" tone="amber"><BigDash /></BentoCard>
          <BentoCard title="Churches" tone="emerald"><BigDash /></BentoCard>
          <BentoCard title="Artists" tone="violet"><BigDash /></BentoCard>
          <BentoCard className="md:col-span-2" title="Approval queue" tone="rose"><Rows compact /></BentoCard>
          <BentoCard className="md:col-span-2" title="Community activity" tone="cyan"><MiniActivity compact /></BentoCard>
          <BentoCard className="md:col-span-3" title="Operations shortcuts" tone="blue"><QuickActions horizontal /></BentoCard>
          <BentoCard title="Health" tone="emerald"><StatusRows /></BentoCard>
        </div>
      </div>
    </PreviewShell>
  );
}

function PrecisionPreview() {
  return (
    <PreviewShell compact>
      <div className="border-b border-[#14334b] bg-[#051421] px-5 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-white">Operations Console</span>
          <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-[9px] font-semibold text-emerald-300">All systems operational</span>
          <span className="ml-auto text-[9px] text-slate-500">Live workspace · preview</span>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <MetricStrip dense />
        <div className="mt-4 grid gap-4 2xl:grid-cols-[1.6fr_0.75fr]">
          <section className="overflow-hidden rounded-xl border border-[#173b57] bg-[#051421]">
            <div className="flex items-center gap-2 border-b border-[#173b57] px-4 py-3">
              <ShieldCheck className="h-4 w-4 text-cyan-300" />
              <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-200">Work queue</h3>
              <div className="ml-auto flex gap-1">
                {["All", "Reports", "Media", "Users"].map((x, i) => (
                  <span key={x} className={i === 0 ? "rounded-md bg-cyan-400/10 px-2 py-1 text-[9px] text-cyan-200" : "rounded-md px-2 py-1 text-[9px] text-slate-500"}>{x}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-[1.1fr_0.7fr_0.5fr_0.45fr] border-b border-[#173b57] bg-[#071827] px-4 py-2 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              <span>Item</span><span>Type</span><span>Status</span><span>Action</span>
            </div>
            {["Reported Reel", "New Artist Review", "Church Verification", "Mentor Application", "Community Report"].map((item, i) => (
              <div key={item} className="grid grid-cols-[1.1fr_0.7fr_0.5fr_0.45fr] items-center border-b border-[#102d43] px-4 py-3 text-[10px]">
                <span className="font-semibold text-slate-200">{item}</span>
                <span className="text-slate-500">{["Safety", "Music", "Church", "People", "Community"][i]}</span>
                <span className={i === 0 ? "text-rose-300" : "text-amber-300"}>{i === 0 ? "Urgent" : "Pending"}</span>
                <span className="font-semibold text-cyan-300">Review →</span>
              </div>
            ))}
          </section>
          <div className="space-y-4">
            <Panel title="System status" icon={Activity}><StatusRows /></Panel>
            <Panel title="Quick controls" icon={WandSparkles}><QuickActions /></Panel>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

function CommunityPreview() {
  return (
    <PreviewShell>
      <div className="space-y-4 p-4 sm:p-6">
        <section className="overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-[#071b25] to-[#061421] p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300">Community pulse</p>
              <h3 className="mt-2 max-w-xl font-display text-3xl font-semibold text-white">
                See the people and communities behind the numbers.
              </h3>
              <p className="mt-2 max-w-lg text-xs leading-5 text-slate-400">
                A warmer admin experience centered on churches, groups, mentors and active community.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {["Churches", "Groups", "Mentors", "Events"].map((label) => (
                <div key={label} className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
                  <p className="text-[10px] text-slate-500">{label}</p>
                  <p className="mt-2 font-display text-2xl font-semibold text-white">—</p>
                  <p className="mt-1 text-[9px] text-emerald-300">Live data</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Panel title="Community network" icon={Church}>
            <div className="relative min-h-72 overflow-hidden rounded-2xl border border-[#173b57] bg-[#04111d]">
              <div className="absolute left-[16%] top-[24%] h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,.6)]" />
              <div className="absolute left-[48%] top-[38%] h-4 w-4 rounded-full bg-emerald-300 shadow-[0_0_22px_rgba(110,231,183,.55)]" />
              <div className="absolute right-[18%] top-[20%] h-3 w-3 rounded-full bg-violet-300" />
              <div className="absolute bottom-[20%] left-[30%] h-3 w-3 rounded-full bg-amber-300" />
              <div className="absolute bottom-[18%] right-[26%] h-3 w-3 rounded-full bg-cyan-300" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.08),transparent_45%)]" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-xs font-semibold text-white">Church & group activity network</p>
                <p className="mt-1 text-[10px] text-slate-500">Designed for future geographic and engagement views.</p>
              </div>
            </div>
          </Panel>
          <div className="space-y-4">
            <Panel title="Needs attention" icon={ShieldCheck}><Rows /></Panel>
            <Panel title="Recent community activity" icon={Activity}><MiniActivity /></Panel>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

function ExecutivePreview() {
  return (
    <div className="min-h-[760px] bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(139,92,246,0.12),transparent_28%),#020a13]">
      <div className="mx-auto max-w-[1500px] p-4 sm:p-7">
        <header className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-xl">
          <NuruMark className="h-10 w-10" />
          <div>
            <p className="font-display text-lg font-semibold text-white">Nuru Faith</p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Executive Admin</p>
          </div>
          <nav className="mx-auto hidden gap-5 text-[11px] text-slate-400 lg:flex">
            <span className="text-white">Overview</span><span>People</span><span>Content</span><span>Community</span><span>Safety</span>
          </nav>
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]">
            <Bell className="h-4 w-4" />
          </div>
        </header>

        <section className="py-10 sm:py-14">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300">Platform overview</p>
          <h3 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">
            A calmer way to see where Nuru is growing.
          </h3>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
            Premium, spacious and presentation-ready for leadership reviews and partner demos.
          </p>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {["Users", "Active today", "Churches", "Pending reviews"].map((label, index) => (
            <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">{label}</p>
                <span className={["h-2 w-2 rounded-full", index === 3 ? "bg-amber-300" : "bg-emerald-300"].join(" ")} />
              </div>
              <p className="mt-7 font-display text-4xl font-semibold text-white">—</p>
              <p className="mt-2 text-[10px] text-slate-500">Connected to live admin data</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-300" />
              <h4 className="text-sm font-semibold text-white">Growth & activity</h4>
            </div>
            <div className="mt-8 flex h-52 items-end gap-2">
              {[22, 38, 31, 55, 47, 67, 62, 81, 72, 88, 77, 94].map((height, index) => (
                <div key={index} className="flex-1 rounded-t-xl bg-gradient-to-t from-cyan-400/15 to-cyan-300/70" style={{ height: `${height}%` }} />
              ))}
            </div>
          </section>
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
            <h4 className="text-sm font-semibold text-white">Founder focus</h4>
            <div className="mt-5 space-y-3">
              {["Review safety queue", "Approve priority content", "Check church growth", "Manage team roles"].map((x, i) => (
                <div key={x} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-400/10 text-xs font-bold text-cyan-200">{i + 1}</span>
                  <span className="text-xs font-semibold text-slate-200">{x}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricStrip({ dense = false }: { dense?: boolean }) {
  const data = [
    [Users, "Users", "—", "Live data"],
    [Church, "Churches", "—", "Directory"],
    [Music2, "Artists", "—", "Approved"],
    [FileCheck2, "Pending", "—", "Needs review"],
    [Activity, "Active today", "—", "Live data"],
    [BarChart3, "Growth", "—", "7-day trend"],
  ] as const;

  return (
    <section className={["grid gap-2", dense ? "grid-cols-2 xl:grid-cols-6" : "sm:grid-cols-2 xl:grid-cols-6"].join(" ")}>
      {data.map(([Icon, label, value, detail]) => (
        <div key={label} className={["rounded-2xl border border-[#153b5c] bg-[#071727]", dense ? "p-3" : "p-4"].join(" ")}>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-cyan-300" />
            <p className="text-[10px] text-slate-500">{label}</p>
          </div>
          <p className="mt-3 font-display text-2xl font-semibold text-white">{value}</p>
          <p className="mt-1 text-[9px] text-slate-600">{detail}</p>
        </div>
      ))}
    </section>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Home; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#153b5c] bg-[#071727]">
      <div className="flex items-center gap-2 border-b border-[#153b5c] px-4 py-3">
        <Icon className="h-4 w-4 text-cyan-300" />
        <h4 className="text-xs font-semibold text-white">{title}</h4>
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function Rows({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-2">
      {["Media approval", "Safety report", "Mentor verification"].map((label, index) => (
        <div key={label} className={["flex items-center gap-3 rounded-xl border border-[#173b57] bg-[#04111d]", compact ? "p-2" : "p-3"].join(" ")}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
            {index === 0 ? <Music2 className="h-3.5 w-3.5" /> : index === 1 ? <ShieldCheck className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-slate-200">{label}</span>
            <span className="block text-[9px] text-slate-500">Waiting for admin review</span>
          </span>
          <span className="text-[9px] font-semibold text-cyan-300">Review →</span>
        </div>
      ))}
    </div>
  );
}

function MiniActivity({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-2">
      {["New user joined", "Church added", "New post published", "Group activity"].slice(0, compact ? 3 : 4).map((label, index) => (
        <div key={label} className="flex items-center gap-3 py-1">
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
          <span className="flex-1 text-[10px] text-slate-300">{label}</span>
          <span className="text-[9px] text-slate-600">{index + 1}m</span>
        </div>
      ))}
    </div>
  );
}

function QuickActions({ horizontal = false }: { horizontal?: boolean }) {
  const actions = [
    [Church, "Add church"],
    [BookOpenCheck, "Review content"],
    [Music2, "Approve artist"],
    [ShieldCheck, "Review reports"],
  ] as const;
  return (
    <div className={horizontal ? "grid gap-2 sm:grid-cols-4" : "space-y-2"}>
      {actions.map(([Icon, label]) => (
        <div key={label} className="flex min-h-10 items-center gap-2 rounded-xl border border-[#21445e] bg-[#091b2b] px-3 text-[10px] font-semibold text-slate-200">
          <Icon className="h-3.5 w-3.5 text-cyan-300" />
          {label}
        </div>
      ))}
    </div>
  );
}

function StatusRows() {
  return (
    <div className="space-y-2">
      {["Platform", "Database", "Community", "Media"].map((label) => (
        <div key={label} className="flex items-center justify-between text-[10px]">
          <span className="text-slate-400">{label}</span>
          <span className="flex items-center gap-1 text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Operational
          </span>
        </div>
      ))}
    </div>
  );
}

function BentoCard({
  title,
  children,
  className = "",
  tone,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  tone: "cyan" | "blue" | "amber" | "emerald" | "violet" | "rose";
}) {
  const toneClass = {
    cyan: "from-cyan-400/10",
    blue: "from-blue-400/10",
    amber: "from-amber-400/10",
    emerald: "from-emerald-400/10",
    violet: "from-violet-400/10",
    rose: "from-rose-400/10",
  }[tone];
  return (
    <section className={["flex min-h-0 flex-col overflow-hidden rounded-3xl border border-[#173b57] bg-gradient-to-br to-[#061421] p-4", toneClass, className].join(" ")}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</p>
      <div className="mt-2 flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

function BigDash() {
  return (
    <div className="mt-auto">
      <p className="font-display text-3xl font-semibold text-white">—</p>
      <p className="text-[9px] text-slate-500">Live data</p>
    </div>
  );
}
