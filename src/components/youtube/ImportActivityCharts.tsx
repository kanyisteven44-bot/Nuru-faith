export type ImportChartSummary = {
  fetched: number;
  inserted: number;
  skippedExisting: number;
  rejected: number;
  pages: number;
  durationMs: number;
};
export type ImportPageSample = {
  page: number;
  inserted: number;
  existing: number;
  rejected: number;
  durationMs: number;
  fetched: number;
};
export function ImportActivityCharts({
  summary,
  samples,
}: {
  summary: ImportChartSummary;
  samples: ImportPageSample[];
}) {
  const outcomes = [
    { label: "New imports", value: summary.inserted, color: "var(--color-primary)" },
    {
      label: "Already catalogued",
      value: summary.skippedExisting,
      color: "var(--color-muted-foreground)",
    },
    { label: "Excluded / incomplete", value: summary.rejected, color: "var(--color-warning)" },
  ];
  const max = Math.max(1, ...outcomes.map((item) => item.value));
  const points = samples.slice(-20);
  const peak = Math.max(1, ...points.map((item) => item.durationMs));
  const path = points
    .map(
      (item, index) =>
        `${index === 0 ? "M" : "L"}${20 + (index / Math.max(1, points.length - 1)) * 360},${140 - (item.durationMs / peak) * 110}`,
    )
    .join(" ");
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <figure className="rounded-2xl border border-border bg-surface-2/30 p-5">
        <figcaption className="font-semibold">Saved scan outcomes</figcaption>
        <p className="mt-1 text-xs text-muted-foreground">
          Cumulative checkpoint totals, including explicit rescans.
        </p>
        {summary.pages === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">
            A completed page will add the first data point.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {outcomes.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex justify-between gap-3 text-xs">
                  <span>{item.label}</span>
                  <strong>{item.value.toLocaleString()}</strong>
                </div>
                <svg
                  viewBox="0 0 400 12"
                  className="h-3 w-full"
                  role="img"
                  aria-label={`${item.label}: ${item.value}`}
                >
                  <rect width="400" height="12" rx="6" fill="currentColor" opacity="0.08" />
                  <rect width={(item.value / max) * 400} height="12" rx="6" fill={item.color} />
                </svg>
              </div>
            ))}
          </div>
        )}
      </figure>
      <figure className="rounded-2xl border border-border bg-surface-2/30 p-5">
        <figcaption className="font-semibold">Page processing time</figcaption>
        <p className="mt-1 text-xs text-muted-foreground">
          Last 20 pages in this browser run. Lower is faster; includes network and database work.
        </p>
        {points.length < 2 ? (
          <p className="py-8 text-sm text-muted-foreground">
            Complete two pages to compare processing time.
          </p>
        ) : (
          <>
            <svg
              viewBox="0 0 400 165"
              className="mt-3 w-full text-primary"
              role="img"
              aria-label={`Page processing time: ${points.map((item) => `page ${item.page}, ${(item.durationMs / 1000).toFixed(1)} seconds`).join("; ")}`}
            >
              <path d="M20 20 V140 H380" fill="none" stroke="currentColor" opacity="0.15" />
              <path
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <text x="20" y="160" fill="currentColor" fontSize="11">
                Page {points[0]?.page}
              </text>
              <text x="310" y="160" fill="currentColor" fontSize="11">
                Page {points.at(-1)?.page}
              </text>
              <text x="25" y="18" fill="currentColor" fontSize="11">
                {(peak / 1000).toFixed(1)} sec peak
              </text>
            </svg>
            <p className="text-xs text-muted-foreground">
              Latest page: {((points.at(-1)?.durationMs ?? 0) / 1000).toFixed(1)} seconds.
            </p>
          </>
        )}
      </figure>
    </div>
  );
}
