import { useEffect, useRef, useState } from "react";

type Category = "performance" | "accessibility" | "best-practices" | "seo";
type Device = "mobile" | "desktop";
type Detail = { id: string; title: string; displayValue: string; score: number | null; description: string };
type Audit = { scores: Record<Category, number | null>; lcp: string; fcp: string; tbt: string; cls: string; checkedAt: string; finalUrl: string; metrics: Detail[]; opportunities: Detail[]; diagnostics: Detail[]; auditsByCategory: Record<Category, Detail[]> };
const categories: { key: Category; name: string }[] = [
  { key: "performance", name: "Performance" }, { key: "accessibility", name: "Accessibility" },
  { key: "best-practices", name: "Best Practices" }, { key: "seo", name: "SEO" },
];
const emptyScores = (): Record<Category, number | null> => ({
  performance: null, accessibility: null, "best-practices": null, seo: null,
});
const endpoint = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const site = "https://nurufaith.co.ke/";
const auditedPages = [
  { label: "Homepage", url: "https://nurufaith.co.ke/" },
  { label: "Settings", url: "https://nurufaith.co.ke/settings" },
  { label: "App homepage", url: "https://app.nurufaith.co.ke/" },
];
const metricIds = ["first-contentful-paint", "speed-index", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "interactive"];
type RawAudit = { id?: string; title?: string; displayValue?: string; score?: number | null; description?: string; details?: { type?: string } };
const toDetail = (id: string, value?: RawAudit): Detail => ({
  id, title: value?.title ?? id, displayValue: value?.displayValue ?? "Unavailable",
  score: typeof value?.score === "number" ? value.score : null,
  description: value?.description ?? "",
});
const toneFor = (score: number | null) => score == null ? "#94a3b8" : score >= 0.9 ? "#22c55e" : score >= 0.5 ? "#f59e0b" : "#ef4444";
const fmt = (audit: Record<string, { displayValue?: string }>, key: string) => audit[key]?.displayValue ?? "Unavailable";

export function AdminPerformancePanel() {
  const [selectedPage, setSelectedPage] = useState(site);
  const [results, setResults] = useState<Partial<Record<Device, Audit>>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Device, string>>>({});
  const requestId = useRef(0);
  const initialRun = useRef(false);
  async function check(url = selectedPage) {
    const id = ++requestId.current;
    setLoading(true);
    setErrors({});
    setResults({});
    const next: Partial<Record<Device, Audit>> = {};
    const failures: Partial<Record<Device, string>> = {};
    // Sequential requests avoid unnecessary pressure on the public API quota.
    for (const device of ["mobile", "desktop"] as const) {
      try {
        const params = new URLSearchParams({ url, strategy: device });
        for (const { key } of categories) params.append("category", key);
        const response = await fetch(endpoint + "?" + params.toString(), { cache: "no-store" });
        if (!response.ok) throw new Error("PageSpeed API returned HTTP " + response.status);
        const data = await response.json();
        const report = data.lighthouseResult;
        if (!report?.categories || !report?.audits) throw new Error("Incomplete Lighthouse report");
        const scores = emptyScores();
        for (const { key } of categories) {
          const score = report.categories[key]?.score;
          scores[key] = typeof score === "number" ? Math.round(score * 100) : null;
        }
        next[device] = {
          scores, lcp: fmt(report.audits, "largest-contentful-paint"),
          fcp: fmt(report.audits, "first-contentful-paint"),
          tbt: fmt(report.audits, "total-blocking-time"),
          cls: fmt(report.audits, "cumulative-layout-shift"),
          checkedAt: new Date().toLocaleString(),
          finalUrl: report.finalUrl ?? url,
          metrics: metricIds.map(id => toDetail(id, report.audits[id])),
          opportunities: Object.entries(report.audits as Record<string, RawAudit>)
            .filter(([, audit]) => audit.details?.type === "opportunity" && audit.score != null && audit.score < 0.9)
            .map(([id, audit]) => toDetail(id, audit))
            .sort((a, b) => (a.score ?? 1) - (b.score ?? 1)).slice(0, 12),
          diagnostics: Object.entries(report.audits as Record<string, RawAudit>)
            .filter(([, audit]) => audit.score != null && audit.score < 0.9 && audit.details?.type !== "opportunity")
            .map(([id, audit]) => toDetail(id, audit))
            .sort((a, b) => (a.score ?? 1) - (b.score ?? 1)).slice(0, 20),
          auditsByCategory: Object.fromEntries(categories.map(({ key }) => [key,
            (report.categories[key]?.auditRefs ?? []).map((ref: { id: string }) => toDetail(ref.id, report.audits[ref.id]))
          ])) as Record<Category, Detail[]>,
        };
      } catch (error) {
        failures[device] = error instanceof Error ? error.message : "Could not retrieve report";
      }
    }
    if (id === requestId.current) {
      setResults(next);
      setErrors(failures);
      setLoading(false);
    }
  }
  useEffect(() => {
    if (initialRun.current) return;
    initialRun.current = true;
    void check(site);
    return () => { /* Keep the initial request valid across React StrictMode effect replay. */ };
  }, []);
  return (
    <section className="space-y-5 rounded-2xl border border-[#153b5c] bg-[#051421] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">Lighthouse performance & quality</h2>
          <p className="mt-1 text-sm text-slate-400">Four Lighthouse categories · Mobile and desktop · Choose the exact public page</p>
        </div>
        <button type="button" onClick={() => void check(selectedPage)} disabled={loading} className="min-h-11 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-[#062033] disabled:opacity-50">
          {loading ? "Checking…" : "Run fresh audit"}
        </button>
      </div>
      <label className="block text-sm font-medium text-slate-200">Page to audit<select value={selectedPage} onChange={(event) => { const url = event.target.value; setSelectedPage(url); void check(url); }} disabled={loading} className="mt-2 block w-full rounded-xl border border-[#234b68] bg-[#091e30] px-3 py-3 text-sm text-white">{auditedPages.map((page) => <option key={page.url} value={page.url}>{page.label} · {page.url}</option>)}</select></label>
      <p className="text-xs text-slate-400">Fresh checks use Google's PageSpeed Insights API. Availability and rate limits are controlled by Google. No scores are shown until a report is received.</p>
      <div className="grid gap-4 xl:grid-cols-2">
        {(["mobile", "desktop"] as const).map(device => {
          const result = results[device];
          return <div key={device} className="rounded-xl border border-[#234b68] bg-[#091e30] p-4">
            <h3 className="text-base font-semibold capitalize text-white">{device}</h3>
            <p className="mt-1 text-xs text-slate-400">{result ? "Measured " + result.checkedAt : "No measurement received yet"}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
              {categories.map(({ key, name }) => {
                const score = result?.scores[key];
                const tone = score == null ? "#64748b" : score >= 90 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
                return <div key={key} className="flex flex-col items-center rounded-xl border border-white/10 bg-[#061523] p-3 text-center">
                  <div role={score == null ? undefined : "progressbar"} aria-label={device + " " + name} aria-valuenow={score ?? undefined} aria-valuemin={score == null ? undefined : 0} aria-valuemax={score == null ? undefined : 100} className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: score == null ? "#1e293b" : `conic-gradient(${tone} ${score}%, #1e3448 0)` }}>
                    <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#091e30] text-xl font-bold" style={{ color: tone }}>{score == null ? "—" : score}</div>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-200">{name}</p>
                  {score == null && <span className="mt-1 text-[10px] text-slate-400">Unavailable</span>}
                </div>;
              })}
            </div>
            {result && <div className="mt-5 space-y-5">
              <div>
                <h4 className="text-sm font-semibold text-white">Lighthouse performance metrics</h4>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {result.metrics.map(metric => <div key={metric.id} className="rounded-lg border border-white/10 bg-[#061523] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-300">{metric.title}</span>
                      <strong className="text-sm text-white">{metric.displayValue}</strong>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700" role={metric.score == null ? undefined : "progressbar"} aria-label={metric.title} aria-valuenow={metric.score == null ? undefined : Math.round(metric.score * 100)} aria-valuemin={0} aria-valuemax={100}>
                      {metric.score != null && <div className="h-full rounded-full" style={{ width: Math.max(2, metric.score * 100) + "%", backgroundColor: toneFor(metric.score) }} />}
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">Relative Lighthouse metric score, not raw duration</p>
                  </div>)}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Optimization opportunities</h4>
                {result.opportunities.length ? <div className="mt-2 space-y-2">{result.opportunities.map(item => <details key={item.id} className="rounded-lg border border-white/10 p-3"><summary className="cursor-pointer text-xs text-slate-200">{item.title} · {item.displayValue}</summary><p className="mt-2 text-xs text-slate-400">{item.description || "Review this Lighthouse finding."}</p></details>)}</div> : <p className="mt-2 text-xs text-slate-400">No scored opportunities were returned.</p>}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Diagnostics</h4>
                <div className="mt-2 space-y-2">{result.diagnostics.length ? result.diagnostics.map(item => <details key={item.id} className="rounded-lg border border-white/10 p-3"><summary className="cursor-pointer text-xs text-slate-200">{item.title} · {item.displayValue}</summary><p className="mt-2 text-xs text-slate-400">{item.description || "See Lighthouse report for details."}</p></details>) : <p className="text-xs text-slate-400">No scored diagnostics returned.</p>}</div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Full category audit results</h4>
                {categories.map(({ key, name }) => <details key={key} className="mt-2 rounded-lg border border-white/10 p-3"><summary className="cursor-pointer text-sm font-medium text-slate-200">{name} · {result.auditsByCategory[key].length} checks</summary><div className="mt-3 space-y-2">{result.auditsByCategory[key].map(item => <div key={item.id} className="flex items-start justify-between gap-3 border-b border-white/5 pb-2 text-xs"><span className="text-slate-300">{item.title}</span><span className="shrink-0 font-medium" style={{ color: toneFor(item.score) }}>{item.displayValue === "Unavailable" ? (item.score == null ? "Not scored" : Math.round(item.score * 100) + "/100") : item.displayValue}</span></div>)}</div></details>)}
              </div>
              <p className="break-all text-[11px] text-slate-500">Audited URL: {result.finalUrl}</p>
            </div>}
            {errors[device] && <p role="alert" className="mt-3 text-xs text-amber-300">Audit unavailable: {errors[device]}</p>}
          </div>;
        })}
      </div>
      <p className="text-xs text-slate-400">Lighthouse categories: red 0–49, amber 50–89, green 90–100. An unavailable category is never treated as zero.</p>
      <p className="text-xs text-slate-400">Target: mobile performance ≥80. Lighthouse scores are lab measurements, not real-user monitoring or tests of authenticated pages. Run-to-run results can vary.</p>
      <a href="https://github.com/kanyisteven44-bot/Nuru-faith/actions/workflows/performance.yml" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-xl border border-cyan-400/40 px-4 text-sm font-semibold text-cyan-200">View scheduled Lighthouse reports ↗</a>
    </section>
  );
}
