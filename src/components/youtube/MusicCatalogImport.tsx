import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Loader2, Music2, Pause, RotateCcw, Users } from "lucide-react";
import { importReviewedCatalogPage, getCatalogImportDashboard } from "@/lib/musicCatalog.functions";
import { resolveYouTubeCreatorLink } from "@/lib/mediaAdmin.functions";
import { mapImportInputs } from "@/lib/importConcurrency";
import { ImportActivityCharts, type ImportPageSample } from "./ImportActivityCharts";
const SingerImport = lazy(() =>
  import("./SingerImport").then((module) => ({ default: module.SingerImport })),
);

export function MusicCatalogImport({
  presetChannelId = "",
  presetKind,
}: { presetChannelId?: string; presetKind?: "music" | "podcast" } = {}) {
  const client = useQueryClient();
  const [kind, setKind] = useState<"music" | "podcast">(presetKind ?? "music");
  const [mode, setMode] = useState<"songs" | "singers">("songs");
  const [running, setRunning] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [channelFilter, setChannelFilter] = useState("");
  const [confirmRescan, setConfirmRescan] = useState(false);
  const [message, setMessage] = useState(
    "Resume scans only unfinished artists. Completed history stays saved, including after you close this page.",
  );
  const [samples, setSamples] = useState<ImportPageSample[]>([]);
  const [runAdded, setRunAdded] = useState(0);
  const pause = useRef(false),
    active = useRef(false);
  const dashboard = useQuery({
    queryKey: ["catalog-import-dashboard", kind],
    queryFn: () => getCatalogImportDashboard({ data: { kind } }),
    staleTime: 10000,
    refetchInterval: running ? 15000 : false,
    refetchIntervalInBackground: false,
    retry: 1,
  });
  useEffect(
    () => () => {
      pause.current = true;
    },
    [],
  );
  useEffect(() => {
    if (running) return;
    if (presetKind) setKind(presetKind);
    if (presetChannelId) setChannelFilter(presetChannelId);
  }, [presetChannelId, presetKind, running]);
  const summary = dashboard.data?.summary;
  const checkpoint = dashboard.data?.progress;
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["catalog-import-dashboard"] }),
      client.invalidateQueries({ queryKey: ["media-catalog"] }),
      client.invalidateQueries({ queryKey: ["media-directory"] }),
      client.invalidateQueries({ queryKey: ["admin-fact-snapshot"] }),
      client.invalidateQueries({ queryKey: ["admin-media-workspace-summary"] }),
    ]);
  }
  async function run(restart: boolean) {
    if (active.current || !dashboard.isSuccess) return;
    active.current = true;
    pause.current = false;
    setRunning(true);
    setPausing(false);
    setSamples([]);
    setRunAdded(0);
    try {
      const entries = [
        ...new Set(
          channelFilter
            .split(/[\n,]+/)
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ];
      if (entries.length > 25)
        throw new Error("Use up to 25 creator links or channel IDs per run.");
      if (restart && (!entries.length || !confirmRescan))
        throw new Error("Select creators and confirm before rescanning completed history.");
      setMessage(
        entries.length
          ? "Resolving selected creator links…"
          : "Finding the next unfinished artist…",
      );
      const results = await mapImportInputs(entries, async (entry) =>
        /^UC[A-Za-z0-9_-]{22}$/.test(entry)
          ? entry
          : (await resolveYouTubeCreatorLink({ data: { input: entry } })).channelId,
      );
      const failed = results.find((result) => result.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
      const channelIds = [
        ...new Set(
          results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : [])),
        ),
      ];
      let first = true,
        pages = 0,
        added = 0;
      while (!pause.current) {
        const result = await importReviewedCatalogPage({
          data: { kind, channelIds, restart: first && restart, refreshTotal: first },
        });
        first = false;
        added += result.added;
        setRunAdded(added);
        if (result.stats.fetched || result.sourceName) {
          pages++;
          setSamples((previous) => [
            ...previous.slice(-19),
            {
              page: pages,
              inserted: result.stats.inserted,
              existing: result.stats.skippedExisting,
              rejected: result.stats.rejected,
              durationMs: result.durationMs,
              fetched: result.stats.fetched,
            },
          ]);
        }
        setMessage(
          `${result.sourceName ?? "Saved scans"} · ${pages} page${pages === 1 ? "" : "s"} processed · ${added.toLocaleString()} new ${kind === "music" ? "songs" : "episodes"} this run.${result.next ? " Continuing from the next saved checkpoint." : result.targetReached ? " Episode target reached; remaining source history is retained." : " No unfinished sources remain in this selection."}`,
        );
        // Refresh visible metadata periodically, not after every 50-upload page.
        if (pages > 0 && pages % 5 === 0)
          void client.invalidateQueries({ queryKey: ["catalog-import-dashboard", kind] });
        if (!result.next) break;
      }
      if (pause.current)
        setMessage(
          `Paused after the current page. ${added.toLocaleString()} new items this run. Resume continues from saved progress.`,
        );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Import paused. Saved checkpoints were retained.",
      );
    } finally {
      active.current = false;
      setRunning(false);
      setPausing(false);
      setConfirmRescan(false);
      await refresh();
    }
  }
  return (
    <section className="nuru-card overflow-hidden">
      <div className="border-b border-border bg-gradient-to-br from-primary/10 via-transparent to-primary/5 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Nuru music operations
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold">Import studio</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              A saved place for every artist. Review singers, scan uploads in batches and see what
              each run actually adds.
            </p>
          </div>
          <span className="rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold">
            {running ? "Processing" : (checkpoint?.status ?? "Not loaded")}
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2" aria-label="Import mode">
          {[
            ["songs", "Songs & episodes", Music2],
            ["singers", "Import singers", Users],
          ].map(([value, label, Icon]) => {
            const ModeIcon = Icon as typeof Music2;
            return (
              <button
                key={value as string}
                type="button"
                aria-pressed={mode === value}
                disabled={running}
                onClick={() => setMode(value as "songs" | "singers")}
                className={`flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50 ${mode === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
              >
                <ModeIcon className="h-4 w-4" />
                {label as string}
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-6 p-5 sm:p-7">
        {mode === "singers" ? (
          <Suspense fallback={<p role="status">Loading singer tools…</p>}>
            <SingerImport />
          </Suspense>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ["Reviewed sources", summary?.sourceTotal],
                ["History completed", summary?.completedSources],
                ["Saved pages", summary?.pages],
                ["New this run", runAdded],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="rounded-2xl border border-border bg-surface-2/30 p-4"
                >
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-2 font-display text-2xl font-bold">
                    {typeof value === "number" ? value.toLocaleString() : "—"}
                  </p>
                </div>
              ))}
            </div>
            {dashboard.isError && (
              <div role="alert" className="rounded-xl border border-warning/30 p-4 text-sm">
                {dashboard.error instanceof Error
                  ? dashboard.error.message
                  : "Import history is unavailable."}
                <button
                  type="button"
                  className="ml-3 min-h-11 underline"
                  onClick={() => void dashboard.refetch()}
                >
                  Retry history
                </button>
              </div>
            )}
            {summary && (
              <div>
                <div className="mb-2 flex justify-between gap-3 text-xs text-muted-foreground">
                  <span>Reviewed source history coverage</span>
                  <span>
                    {summary.completedSources} / {summary.sourceTotal}
                  </span>
                </div>
                <progress
                  aria-label="Completed artist history scans"
                  max={Math.max(1, summary.sourceTotal)}
                  value={summary.completedSources}
                  className="h-2 w-full accent-primary"
                />
              </div>
            )}
            <div className="grid items-start gap-5 lg:grid-cols-[1fr_2fr]">
              <label className="block text-sm font-semibold">
                Collection
                <select
                  aria-label="Import collection"
                  className="input-nuru mt-2"
                  disabled={running}
                  value={kind}
                  onChange={(event) => {
                    setKind(event.target.value as "music" | "podcast");
                    setSamples([]);
                    setRunAdded(0);
                    setConfirmRescan(false);
                    setMessage("Ready to resume unfinished source history.");
                  }}
                >
                  <option value="music">Songs</option>
                  <option value="podcast">Video podcasts</option>
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Selected creators (optional)
                <textarea
                  aria-label="YouTube creators (optional)"
                  rows={3}
                  className="input-nuru mt-2 min-h-24"
                  disabled={running}
                  value={channelFilter}
                  onChange={(event) => {
                    setChannelFilter(event.target.value);
                    setConfirmRescan(false);
                  }}
                  placeholder="@handle, YouTube channel/video link, or UC… ID"
                />
                <span className="mt-2 block text-xs font-normal leading-relaxed text-muted-foreground">
                  One per line, up to 25. Leave blank for all reviewed sources. Changing this
                  selection keeps every artist’s saved checkpoint.
                </span>
              </label>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <p role="status" aria-live="polite" className="text-sm leading-relaxed">
                {message}
              </p>
              {checkpoint?.last_error && !running && (
                <p className="mt-2 text-xs text-warning">
                  Last server error: {checkpoint.last_error}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={running || !dashboard.isSuccess}
                onClick={() => void run(false)}
                className="flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50"
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Resume unfinished scans
              </button>
              {running && (
                <button
                  type="button"
                  disabled={pausing}
                  className="flex min-h-12 items-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold disabled:opacity-50"
                  onClick={() => {
                    pause.current = true;
                    setPausing(true);
                  }}
                >
                  <Pause className="h-4 w-4" />
                  {pausing ? "Pausing after this page…" : "Pause after this page"}
                </button>
              )}
            </div>
            {summary && <ImportActivityCharts summary={summary} samples={samples} />}
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-left text-xs">
                <caption className="p-4 text-left font-semibold">
                  Recently checkpointed sources
                </caption>
                <thead className="bg-surface-2 text-muted-foreground">
                  <tr>
                    {["Artist / creator", "State", "Pages", "New imports", "Last saved"].map(
                      (label) => (
                        <th key={label} className="px-4 py-3 font-medium">
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {summary?.recent.map((source) => (
                    <tr key={source.channel_id} className="border-t border-border">
                      <td className="px-4 py-3 font-semibold">{source.name}</td>
                      <td className="px-4 py-3">
                        {source.completed ? (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Complete
                          </span>
                        ) : (
                          "In progress"
                        )}
                      </td>
                      <td className="px-4 py-3">{source.pages_processed.toLocaleString()}</td>
                      <td className="px-4 py-3">{source.inserted.toLocaleString()}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {source.updated_at.replace("T", " ").slice(0, 16)} UTC
                      </td>
                    </tr>
                  ))}
                  {!summary?.recent.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                        No per-artist checkpoints recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <details className="rounded-2xl border border-border p-4">
              <summary className="cursor-pointer text-sm font-semibold">
                Advanced · Deliberately rescan selected creators
              </summary>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                To check new uploads on a completed artist or recover an expired YouTube page token,
                explicitly rescan that artist. This starts its history at page one and uses API
                quota. Existing catalogue items stay deduplicated. All-creators resets are disabled.
              </p>
              <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={confirmRescan}
                  disabled={running || !channelFilter.trim()}
                  onChange={(event) => setConfirmRescan(event.target.checked)}
                />
                I want to restart the selected creators from page one.
              </label>
              <button
                type="button"
                disabled={
                  running || !dashboard.isSuccess || !channelFilter.trim() || !confirmRescan
                }
                onClick={() => void run(true)}
                className="mt-2 flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Rescan selected creators
              </button>
            </details>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Saved outcomes begin with this upgrade. Older per-artist completion history was not
              recorded. A failed page may be fetched again safely; successful checkpoints are
              retained. Keep this tab open while processing. Pause saves the current page before
              stopping.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
