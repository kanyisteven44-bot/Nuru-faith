import { useState } from "react";

type Category = "performance" | "accessibility" | "best-practices" | "seo";
type Device = "mobile" | "desktop";
type Audit = { scores: Record<Category, number | null>; lcp: string; fcp: string; tbt: string; cls: string; checkedAt: string };
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
const fmt = (audit: Record<string, { displayValue?: string }>, key: string) => audit[key]?.displayValue ?? "Unavailable";

export function AdminPerformancePanel() {
  const [selectedPage, setSelectedPage] = useState(site);
  const [results, setResults] = useState<Partial<Record<Device, Audit>>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Device, string>>>({});
  async function check() {
    setLoading(true);
    setErrors({});
    setResults({});
    const next: Partial<Record<Device, Audit>> = {};
    const failures: Partial<Record<Device, string>> = {};
    // Sequential requests avoid unnecessary pressure on the public API quota.
    for (const device of ["mobile", "desktop"] as const) {
      try {
        const params = new URLSearchParams({ url: selectedPage, strategy: device });
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
        };
      } catch (error) {
        failures[device] = error instanceof Error ? error.message : "Could not retrieve report";
      }
    }
    setResults(next);
    setErrors(failures);
    setLoading(false);
  }
  return (
    <section className="space-y-5 rounded-2xl border border-[#153b5c] bg-[#051421] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">Lighthouse performance & quality</h2>
          <p className="mt-1 text-sm text-slate-400">Four Lighthouse categories · Mobile and desktop · Choose the exact public page</p>
        </div>
        <button type="button" onClick={() => void check()} disabled={loading} className="min-h-11 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-[#062033] disabled:opacity-50">
          {loading ? "Checking…" : "Run fresh audit"}
        </button>
      </div>
      <label className="block text-sm font-medium text-slate-200">Page to audit<select value={selectedPage} onChange={(event) => { setSelectedPage(event.target.value); setResults({}); setErrors({}); }} disabled={loading} className="mt-2 block w-full rounded-xl border border-[#234b68] bg-[#091e30] px-3 py-3 text-sm text-white">{auditedPages.map((page) => <option key={page.url} value={page.url}>{page.label} · {page.url}</option>)}</select></label>
      <p className="text-xs text-slate-400">Fresh checks use Google's PageSpeed Insights API. Availability and rate limits are controlled by Google. No scores are shown until a report is received.</p>
      <div className="grid gap-4 xl:grid-cols-2">
        {(["mobile", "desktop"] as const).map(device => {
          const result = results[device];
          return <div key={device} className="rounded-xl border border-[#234b68] bg-[#091e30] p-4">
            <h3 className="text-base font-semibold capitalize text-white">{device}</h3>
            <p className="mt-1 text-xs text-slate-400">{result ? "Measured " + result.checkedAt : "No fresh measurement this session"}</p>
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
            {result && <p className="mt-4 text-xs text-slate-300">LCP {result.lcp} · FCP {result.fcp} · TBT {result.tbt} · CLS {result.cls}</p>}
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
