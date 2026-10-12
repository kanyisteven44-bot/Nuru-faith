import { useState } from "react";

type Check = { title: string; status: "ok" | "error"; detail: string; steps: string[]; link: string; linkLabel: string };
const site = "https://nurufaith.co.ke/";
const checks = [
  { name: "Public website", url: site, guide: ["Check the Vercel production deployment status.", "Confirm the domain and DNS settings are correct.", "Redeploy only after the build and account quota issues are resolved."], link: "https://vercel.com/vortiqora/nuru-faith" },
  { name: "Main app entry", url: "https://app.nurufaith.co.ke/", guide: ["Check the app domain is assigned to the correct Vercel project.", "Inspect Vercel function and deployment logs.", "Test the page again on mobile after deployment."], link: "https://vercel.com/vortiqora/nuru-faith" },
];
export function AdminHealthPanel() {
  const [results, setResults] = useState<Check[]>([]);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState<string | null>(null);
  async function run() {
    setBusy(true);
    const next: Check[] = [];
    for (const item of checks) {
      try {
        // A no-cors browser request cannot inspect HTTP status or content. Treat
        // opaque responses as unknown rather than a successful health check.
        const response = await fetch(item.url, { method: "GET", mode: "no-cors", cache: "no-store" });
        if (response.type === "opaque") {
          next.push({ title: item.name, status: "error", detail: "Browser security prevents verifying this site's response. This is not proof of an outage.", steps: item.guide, link: item.link, linkLabel: "Check deployment" });
        } else {
          next.push({ title: item.name, status: response.ok ? "ok" : "error", detail: response.ok ? "Website responded to the check." : "The website returned HTTP " + response.status, steps: item.guide, link: item.link, linkLabel: "Check deployment" });
        }
      } catch {
        next.push({ title: item.name, status: "error", detail: "Unable to verify the website from this browser. Network or browser restrictions may be involved.", steps: item.guide, link: item.link, linkLabel: "Check deployment" });
      }
    }
    setResults(next);
    setChecked(new Date().toLocaleString());
    setBusy(false);
  }
  const guides = [
    { title: "Voice note won't play", symptom: "Audio shows 0:00 or 'unavailable'.", steps: ["Try another recording to see whether the issue affects one file or all files.", "Check that the uploaded file exists and its signed URL has not expired.", "Inspect Supabase Storage access policies and upload errors without making files public."], link: "https://supabase.com/dashboard" },
    { title: "New changes are missing", symptom: "The website still shows an old interface.", steps: ["Open the Vercel deployments page and find the latest successful production build.", "Check GitHub CI and build logs for failures.", "Resolve any deployment quota or build error, then verify the deployed commit before refreshing the app."], link: "https://vercel.com/vortiqora/nuru-faith" },
    { title: "Sign-in fails", symptom: "Members cannot log in or create accounts.", steps: ["Check the Supabase Authentication logs for the exact failure.", "Confirm the site URL and redirect URLs match the production domains.", "Check network requests and permissions; never disable security policies just to make login work."], link: "https://supabase.com/dashboard" },
    { title: "Pages load slowly", symptom: "Users wait too long for the main content.", steps: ["Run the Performance dashboard's Lighthouse audit.", "Check Largest Contentful Paint, unused JavaScript, images and slow requests.", "Optimize the largest verified bottleneck, deploy and compare new scores."], link: "https://github.com/kanyisteven44-bot/Nuru-faith/actions/workflows/performance.yml" },
  ];
  return <section className="space-y-5 rounded-2xl border border-[#153b5c] bg-[#051421] p-4 text-slate-100 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">App Health & Error Center</h2><p className="text-sm text-slate-400">Simple explanations and safe steps to investigate problems.</p></div><button type="button" onClick={() => void run()} disabled={busy} className="min-h-11 rounded-xl bg-cyan-300 px-4 font-semibold text-[#062033] disabled:opacity-50">{busy ? "Checking…" : "Check website health"}</button></div>
    <p className="text-xs text-slate-400">These checks are limited to what your browser can verify. They do not read private production logs, Supabase errors or user messages. A browser-restricted result is not proof the site is down.</p>
    {checked && <p className="text-xs text-slate-400">Last checked: {checked}</p>}
    {results.map(result => <div key={result.title} className="rounded-xl border border-[#234b68] bg-[#091e30] p-4"><h3 className="font-semibold">{result.title}</h3><p className={"mt-1 text-sm " + (result.status === "ok" ? "text-emerald-300" : "text-amber-300")}>{result.detail}</p>{result.status === "error" && <><p className="mt-3 text-sm font-semibold">How to investigate</p><ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-300">{result.steps.map(step => <li key={step}>{step}</li>)}</ol></>}<a href={result.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-cyan-300">{result.linkLabel} ↗</a></div>)}
    <h3 className="text-lg font-semibold">Common errors & how to fix them</h3>
    <div className="grid gap-3 md:grid-cols-2">{guides.map(guide => <details key={guide.title} className="rounded-xl border border-[#234b68] bg-[#091e30] p-4"><summary className="cursor-pointer font-semibold">{guide.title}</summary><p className="mt-2 text-sm text-slate-400">{guide.symptom}</p><p className="mt-3 text-sm font-semibold">Steps to fix or diagnose</p><ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-300">{guide.steps.map(step => <li key={step}>{step}</li>)}</ol><a href={guide.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-cyan-300">Open diagnostic tools ↗</a></details>)}</div>
    <p className="text-xs text-slate-500">Troubleshooting guidance is not an automatic fix. Confirm the underlying error before making production changes.</p>
  </section>;
}
