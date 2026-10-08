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
  ExternalLink,
  LockKeyhole,
  AlertTriangle,
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
  const [problemsOnly, setProblemsOnly] = useState(false);
  const failedChecks = healthChecks.filter((check) => check.error);
  const failedImports = (facts?.imports ?? []).filter((job) => Boolean(job.lastError));
  const incidentCount = failedChecks.length + failedImports.length + Number(factsError);
  const stillChecking = factsLoading || healthChecks.some((check) => check.loading);

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
          <section aria-label="Live incident triage" className="rounded-2xl border border-[#1c3e58] bg-[#071727] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <AlertTriangle className="h-5 w-5 text-amber-300" /> Incident triage
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Checks existing admin data requests and media import failures. External provider alerts
                  are not connected, and an empty list is not proof that no attack occurred.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={problemsOnly} onChange={(event) => setProblemsOnly(event.target.checked)}
                  className="h-4 w-4 accent-cyan-400" />
                Problems only
              </label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 p-4">
                <p className="text-xs text-slate-400">Reported failures</p>
                <p className="mt-1 text-2xl font-semibold text-white">{incidentCount}</p>
              </div>
              <div className="rounded-xl border border-white/10 p-4">
                <p className="text-xs text-slate-400">Current check</p>
                <p className="mt-1 text-sm font-semibold text-cyan-200">{stillChecking ? "Checking…" : "Loaded"}</p>
              </div>
              <div className="rounded-xl border border-white/10 p-4">
                <p className="text-xs text-slate-400">Security event feed</p>
                <p className="mt-1 text-sm font-semibold text-amber-200">Not connected</p>
              </div>
            </div>
            {incidentCount > 0 ? (
              <ul role="status" className="mt-4 space-y-2">
                {failedChecks.map((check) => (
                  <li key={check.label} className="rounded-xl border border-rose-400/20 p-4">
                    <p className="text-sm font-semibold text-rose-200">{check.label} request failed</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Refresh the data and inspect the related service logs. This does not prove the entire service is offline.
                    </p>
                  </li>
                ))}
                {factsError && <li className="rounded-xl border border-rose-400/20 p-4 text-sm text-rose-200">
                  Admin facts failed to load. Check server function logs and staff permissions.
                </li>}
                {failedImports.map((job) => (
                  <li key={job.kind} className="rounded-xl border border-rose-400/20 p-4">
                    <p className="text-sm font-semibold text-rose-200">{job.kind} import error</p>
                    <p className="mt-1 break-words text-xs text-slate-300">{job.lastError}</p>
                  </li>
                ))}
              </ul>
            ) : !problemsOnly && (
              <p role="status" className="mt-4 text-sm text-slate-300">
                {stillChecking ? "Waiting for current data checks…" : "No errors reported by the checked admin data requests."}
              </p>
            )}
          </section>
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
          {isSuperAdmin && (
            <section aria-label="Security and integration supervision" className="space-y-4">
              <div className="rounded-2xl border border-amber-400/25 bg-[#10202e] p-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <AlertTriangle className="h-5 w-5 text-amber-300" /> Security watch
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Review access changes, suspicious sign-ins, authentication failures and software vulnerabilities.
                  This panel does not claim to detect attackers: verified alerts require audit logs, firewall
                  events and connected monitoring. Never identify an account owner as an attacker from an IP address alone.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => onNavigate("roles")}
                    className="rounded-xl border border-[#34536a] bg-[#081827] p-4 text-left text-sm text-cyan-200 hover:border-cyan-400">
                    <LockKeyhole className="mb-2 h-5 w-5" /> Review admin access and roles
                  </button>
                  <button type="button" onClick={() => onNavigate("moderation")}
                    className="rounded-xl border border-[#34536a] bg-[#081827] p-4 text-left text-sm text-cyan-200 hover:border-cyan-400">
                    <Flag className="mb-2 h-5 w-5" /> Review reported abuse
                  </button>
                </div>
                <p className="mt-3 text-xs text-amber-200">
                  Account creation and deletion must stay behind verified identity, MFA, confirmation and an audit trail.
                  Social platform accounts cannot be created or deleted here without each provider's authorization.
                </p>
              </div>
              <div className="rounded-2xl border border-[#1c3e58] bg-[#071727] p-5">
                <h2 className="text-lg font-semibold text-white">Provider consoles &amp; incidents</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Direct links to the actual provider dashboards. These are not live integrations:
                  log in to each provider to see current events. No green status is shown without an API check.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    {name:"GitHub",description:"Failed workflows, code security and access",href:"https://github.com/kanyisteven44-bot/Nuru-faith/actions"},
                    {name:"Vercel",description:"Deployments, errors and runtime logs",href:"https://vercel.com/vortiqora/nuru-faith"},
                    {name:"Supabase",description:"Authentication, policies and database logs",href:"https://supabase.com/dashboard/project/qnqkcqywvqzfkickezxd"},
                    {name:"Truehost",description:"Domain, DNS, hosting and support",href:"https://truehost.co.ke/cloud/clientarea.php"},
                    {name:"Social accounts",description:"Connect accounts through official provider authorization",href:"https://www.facebook.com/business/tools/meta-business-suite"},
                  ].map((provider) => (
                    <a key={provider.name} href={provider.href} target="_blank" rel="noopener noreferrer"
                      className="group rounded-xl border border-[#23435b] bg-[#081827] p-4 transition hover:border-cyan-400/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                      <span className="flex items-center justify-between font-semibold text-white">
                        {provider.name}<ExternalLink className="h-4 w-4 text-cyan-300" />
                      </span>
                      <span className="mt-2 block text-xs leading-5 text-slate-400">{provider.description}</span>
                      <span className="mt-2 block text-[11px] text-amber-200">Open provider · status not connected</span>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          )}
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
