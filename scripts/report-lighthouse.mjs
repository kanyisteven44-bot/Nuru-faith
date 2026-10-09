import { readFileSync } from "node:fs";

const report = JSON.parse(readFileSync(process.argv[2] || "browser-qa/lighthouse-mobile.json", "utf8"));
const metricIds = ["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index"];
console.log("LIGHTHOUSE " + JSON.stringify({
  categories: Object.fromEntries(Object.entries(report.categories).map(([key, value]) => [key, value.score])),
  audits: Object.fromEntries(metricIds.map(key => [key, report.audits[key]?.displayValue])),
}));

// Only public-page diagnostics. Strip resource queries and keep output bounded.
const pathOnly = value => {
  try { return new URL(value).pathname; } catch { return value; }
};
const ids = ["largest-contentful-paint-element", "lcp-breakdown", "render-blocking-resources", "unused-javascript", "unused-css-rules", "uses-optimized-images", "modern-image-formats", "font-display", "diagnostics"];
for (const id of ids) {
  const audit = report.audits[id];
  if (!audit) continue;
  console.log("LH_DIAGNOSTIC " + JSON.stringify({
    id, score: audit.score, displayValue: audit.displayValue,
    savingsMs: audit.details?.overallSavingsMs,
    items: (audit.details?.items || []).slice(0, 8).map(item => JSON.parse(JSON.stringify(item, (key, value) =>
      key === "url" ? pathOnly(value) : key === "snippet" ? String(value).slice(0, 250) : value))),
  }));
}
const network = report.audits["network-requests"]?.details?.items || [];
console.log("LH_RESOURCES " + JSON.stringify(network
  .filter(item => /Script|Stylesheet|Image|Font|Document/.test(item.resourceType))
  .sort((a, b) => b.transferSize - a.transferSize).slice(0, 15)
  .map(item => ({ path: pathOnly(item.url), type: item.resourceType, bytes: item.transferSize,
    start: item.startTime, end: item.endTime, status: item.statusCode }))));
