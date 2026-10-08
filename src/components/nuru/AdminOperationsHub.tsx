import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Download,
  ShieldCheck,
  Users,
  Music2,
  Flag,
  BookOpen,
  Church,
  Bot,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import type { AdminFactSnapshot } from "@/lib/adminFacts.functions";
import type { AdminSectionId } from "./AdminCommandShell";
import { AdminOperations } from "./AdminOperations";

type ChurchRow = Database["public"]["Tables"]["churches"]["Row"];
type Workspace = "overview" | "Mentors" | "AI topics";

export function AdminOperationsHub({
  isSuperAdmin,
  roleLabel,
  churches,
  facts,
  factsError,
  factsLoading,
  healthChecks,
  onNavigate,
}: {
  isSuperAdmin: boolean;
  roleLabel: string;
  churches: ChurchRow[];
  facts: AdminFactSnapshot | undefined;
  factsError: boolean;
  factsLoading: boolean;
  healthChecks: Array<{ label: string; error: boolean; loading: boolean }>;
  onNavigate: (section: AdminSectionId) => void;
}) {
  const [workspace, setWorkspace] = useState<Workspace>("overview");
  const actions = [
    {
      section: "users" as const,
      title: "People & membership",
      detail: "Find members and inspect church membership.",
      icon: Users,
      restricted: true,
    },
    {
      section: "churches" as const,
      title: "Church directory",
      detail: "Review churches and maintain directory records.",
      icon: Church,
      restricted: false,
    },
    {
      section: "music" as const,
      title: "Media & imports",
      detail: "Review creators, approve media and track catalogue imports.",
      icon: Music2,
      restricted: roleLabel === "Church Admin",
    },
    {
      section: "moderation" as const,
      title: "Safety & reports",
      detail: "Investigate reports and track them through resolution.",
      icon: Flag,
      restricted: false,
    },
    {
      section: "content" as const,
      title: "Learning library",
      detail: "Open courses, devotionals and Scripture series.",
      icon: BookOpen,
      restricted: false,
    },
    {
      section: "roles" as const,
      title: "Access & roles",
      detail: "Manage staff assignments with verified two-factor authentication.",
      icon: ShieldCheck,
      restricted: true,
    },
  ].filter((action) => isSuperAdmin || !action.restricted);

  function exportSnapshot() {
    if (!facts || factsError || factsLoading) return;
    const blob = new Blob([JSON.stringify(facts, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nuru-operations-${facts.capturedAt.slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section className="space-y-6" aria-label="Platform operations">
      <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-[#102f49] via-[#081b2d] to-[#06111c] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Nuru command center
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-white">
              Run your community with clarity.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              People, content and safety in one workspace. Every action uses your existing{" "}
              {roleLabel.toLowerCase()} permissions.
            </p>
          </div>
          <button
            type="button"
            onClick={exportSnapshot}
            disabled={!facts || factsError || factsLoading}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> Export operational report
          </button>
        </div>
        <p className="mt-5 text-xs text-slate-400" role="status">
          {factsError
            ? "Snapshot unavailable. Refresh live data to retry."
            : factsLoading
              ? "Loading operational snapshot…"
              : facts
                ? `Snapshot captured ${new Date(facts.capturedAt).toLocaleString()}`
                : "Global operational reports are available to platform staff."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Operations workspaces">
        {(["overview", ...(isSuperAdmin ? ["Mentors", "AI topics"] : [])] as Workspace[]).map(
          (item) => (
            <button
              type="button"
              key={item}
              aria-pressed={workspace === item}
              onClick={() => setWorkspace(item)}
              className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition ${workspace === item ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-100" : "border-[#23435b] bg-[#071727] text-slate-300 hover:border-cyan-400/40"}`}
            >
              {item === "overview"
                ? "All operations"
                : item === "AI topics"
                  ? "AI insights"
                  : "Mentor management"}
            </button>
          ),
        )}
      </div>

      {workspace === "overview" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {actions.map((action) => (
              <button
                key={action.section}
                type="button"
                onClick={() => onNavigate(action.section)}
                className="group rounded-2xl border border-[#1c3e58] bg-[#081827] p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-[#0b2033] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
                    <action.icon className="h-5 w-5" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-slate-500 transition group-hover:text-cyan-300" />
                </div>
                <h2 className="mt-5 text-base font-semibold text-white">{action.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{action.detail}</p>
              </button>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-[#1c3e58] bg-[#071727] p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <Activity className="h-4 w-4 text-cyan-300" /> Data connections
              </h2>
              <p className="mt-2 text-xs text-slate-400">
                Status reflects the latest data request, not a full uptime test.
              </p>
              <ul className="mt-4 divide-y divide-white/5">
                {healthChecks.map((check) => (
                  <li
                    key={check.label}
                    className="flex items-center justify-between gap-3 py-3 text-sm"
                  >
                    <span>{check.label}</span>
                    <span
                      className={
                        check.error
                          ? "text-rose-300"
                          : check.loading
                            ? "text-amber-300"
                            : "text-emerald-300"
                      }
                    >
                      {check.error
                        ? "Needs attention"
                        : check.loading
                          ? "Checking…"
                          : "Data loaded"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-[#1c3e58] bg-[#071727] p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <Bot className="h-4 w-4 text-cyan-300" /> Import monitoring
              </h2>
              {factsError ? (
                <p role="alert" className="mt-4 text-sm text-rose-300">
                  Import status could not load.
                </p>
              ) : factsLoading ? (
                <p role="status" className="mt-4 text-sm text-slate-400">
                  Loading imports…
                </p>
              ) : facts?.imports.length ? (
                <ul className="mt-4 space-y-3">
                  {facts.imports.map((job) => (
                    <li key={job.kind} className="rounded-xl border border-white/10 p-4">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="font-semibold capitalize">{job.kind}</span>
                        <span className={job.lastError ? "text-rose-300" : "text-cyan-200"}>
                          {job.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        {job.importedTotal.toLocaleString()} imported ·{" "}
                        {job.pagesProcessed.toLocaleString()} pages processed
                      </p>
                      {job.lastError && (
                        <p className="mt-2 break-words text-xs text-rose-300">{job.lastError}</p>
                      )}
                      <p className="mt-2 text-xs text-slate-500">
                        Updated {new Date(job.updatedAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-slate-400">
                  No import status available for this account.
                </p>
              )}
            </div>
          </div>
        </>
      ) : isSuperAdmin ? (
        <AdminOperations key={workspace} churches={churches} initialTab={workspace} />
      ) : null}
    </section>
  );
}
