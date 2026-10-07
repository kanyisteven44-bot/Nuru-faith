import { catalogueTarget, MUSIC_SOURCE_TARGET } from "@/lib/catalogTargets";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { importReviewedCatalogPage } from "@/lib/musicCatalog.functions";
import { resolveYouTubeCreatorLink } from "@/lib/mediaAdmin.functions";
import { supabase } from "@/integrations/supabase/client";
import { PrimaryButton } from "@/components/nuru/Primitives";

export function MusicCatalogImport({
  presetChannelId = "",
  presetKind,
}: {
  presetChannelId?: string;
  presetKind?: "music" | "podcast";
} = {}) {
  const client = useQueryClient();
  const [kind, setKind] = useState<"music" | "podcast">(presetKind ?? "music");
  const target = catalogueTarget(kind);
  const [running, setRunning] = useState(false);
  const [channelFilter, setChannelFilter] = useState("");
  const [message, setMessage] = useState(
    "Import real videos from reviewed sources. Progress is saved on the server.",
  );
  const [sourceTotal, setSourceTotal] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const pause = useRef(false);
  const active = useRef(false);
  useEffect(
    () => () => {
      pause.current = true;
    },
    [],
  );
  useEffect(() => {
    if (running) return;
    if (presetKind) setKind(presetKind);
    if (presetChannelId) {
      setChannelFilter(presetChannelId);
      setMessage("Selected reviewed YouTube source is ready to scan.");
    }
  }, [presetChannelId, presetKind, running]);
  useEffect(() => {
    let current = true;
    void Promise.all([
      supabase
        .from("media_catalog_imports")
        .select("status,last_error,imported_total")
        .eq("kind", kind)
        .maybeSingle(),
      supabase
        .from("media_sources")
        .select("id", { head: true, count: "exact" })
        .eq("is_approved", true)
        .eq("is_verified", true)
        .eq("source_type", "youtube")
        .in("content_kind", [kind, "mixed"]),
      supabase
        .from("media_items")
        .select("id", { head: true, count: "exact" })
        .eq("is_approved", true)
        .eq("source", "youtube")
        .eq("media_type", kind),
    ]).then(([progress, sources, items]) => {
      if (!current || active.current) return;
      if (sources.error || items.error || progress.error) {
        setMessage("Catalogue progress could not be loaded. Try resuming the import.");
        return;
      }
      setSourceTotal(sources.count ?? 0);
      setTotal(items.count ?? 0);
      if (progress.data?.last_error) setMessage(progress.data.last_error);
      else if (kind === "music" && progress.data?.status === "exhausted")
        setMessage(
          "All currently reviewed artist sources have been scanned. Newly approved artists can be picked up with Scan again.",
        );
      else if (kind !== "music" && (items.count ?? 0) >= target)
        setMessage("Catalogue target reached.");
      else if (progress.data?.status === "complete")
        setMessage("Previous target completed. Resume the import to expand the catalogue.");
      else if (progress.data?.status === "exhausted")
        setMessage(
          "Reviewed sources exhausted below the target. Add more reviewed creators, then scan again.",
        );
      else if (kind === "music" && (items.count ?? 0) >= target)
        setMessage(
          "Song benchmark reached. Importing still continues until every reviewed artist source is scanned.",
        );
    });
    return () => {
      current = false;
    };
  }, [kind, target]);
  async function resolveChannelIds() {
    const entries = [...new Set(channelFilter.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean))];
    if (entries.length > 25) {
      throw new Error("Use up to 25 creator links or channel IDs in one import run.");
    }

    const resolved: string[] = [];
    for (const entry of entries) {
      if (/^UC[A-Za-z0-9_-]{22}$/.test(entry)) {
        resolved.push(entry);
        continue;
      }
      setMessage(`Resolving YouTube creator: ${entry}`);
      const creator = await resolveYouTubeCreatorLink({ data: { input: entry } });
      resolved.push(creator.channelId);
    }
    return [...new Set(resolved)];
  }

  async function run(fresh: boolean) {
    if (active.current) return;
    let channelIds: string[] = [];
    try {
      channelIds = await resolveChannelIds();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not resolve the selected YouTube creator.");
      return;
    }
    active.current = true;
    pause.current = false;
    setRunning(true);
    let restart = fresh;
    try {
      let fetched = 0;
      let parsed = 0;
      let eligible = 0;
      let inserted = 0;
      let skippedExisting = 0;
      let pages = 0;

      while (!pause.current) {
        const result = await importReviewedCatalogPage({ data: { kind, restart, channelIds } });
        restart = false;
        pages += 1;
        fetched += result.stats.fetched;
        parsed += result.stats.parsed;
        eligible += result.stats.eligible;
        inserted += result.stats.inserted;
        skippedExisting += result.stats.skippedExisting;
        setTotal(result.total);
        await Promise.all([
          client.invalidateQueries({ queryKey: ["media-catalog"] }),
          client.invalidateQueries({ queryKey: ["media-directory"] }),
          client.invalidateQueries({ queryKey: ["admin-fact-snapshot"] }),
          client.invalidateQueries({ queryKey: ["admin-media-workspace-summary"] }),
        ]);

        const progressText =
          `Scanned ${fetched.toLocaleString()} uploads · ` +
          `${eligible.toLocaleString()} eligible · ` +
          `${inserted.toLocaleString()} new · ` +
          `${skippedExisting.toLocaleString()} already in Nuru`;

        if (!result.next) {
          if (result.targetReached) {
            setMessage(`Catalogue target reached. ${progressText}.`);
          } else if (channelIds.length) {
            setMessage(
              inserted > 0
                ? `Creator scan complete. ${progressText}.`
                : eligible > 0
                  ? `Creator scan complete. No new items were added because all ${eligible.toLocaleString()} eligible uploads are already in Nuru.`
                  : `Creator scan complete. YouTube returned ${fetched.toLocaleString()} uploads, but none passed the current Nuru ${kind === "music" ? "music" : "podcast"} checks.`,
            );
          } else {
            setMessage(
              kind === "music"
                ? `Reviewed-source scan complete. ${progressText}.`
                : `Reviewed-source scan complete. ${progressText}.`,
            );
          }
          break;
        }

        setMessage(`Importing… ${progressText}. Page ${pages.toLocaleString()} completed.`);
      }
      if (pause.current)
        setMessage("Paused after the current batch. Resume to continue from saved progress.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import paused. Please try again.");
    } finally {
      active.current = false;
      setRunning(false);
    }
  }
  return (
    <section className="nuru-card space-y-3 p-4">
      <h2 className="font-display text-lg font-semibold">Media catalogue import</h2>
      <label className="block text-sm">
        Collection
        <select
          aria-label="Import collection"
          disabled={running}
          value={kind}
          onChange={(event) => {
            setKind(event.target.value as "music" | "podcast");
            setTotal(null);
            setMessage("Ready to scan reviewed sources.");
          }}
          className="input-nuru mt-2"
        >
          <option value="music">Songs</option>
          <option value="podcast">Video podcasts</option>
        </select>
      </label>
      <label className="block text-sm">
        YouTube creators (optional)
        <textarea
          aria-label="YouTube creators (optional)"
          className="input-nuru mt-2 min-h-24"
          rows={4}
          disabled={running}
          value={channelFilter}
          onChange={(event) => setChannelFilter(event.target.value)}
          placeholder={"https://www.youtube.com/@Marionshakoke\n@anothercreator\nUC..."}
        />
      </label>
      <p className="text-xs leading-5 text-muted-foreground">
        Paste an @handle, channel link, video link, Shorts link, legacy user link, or channel ID.
        Put one creator per line. Leave this empty to scan every reviewed source.
      </p>
      <p className="text-sm text-muted-foreground" role="status">
        {message}
      </p>
      {sourceTotal !== null && (
        <p className="text-sm">
          {sourceTotal.toLocaleString()} reviewed{" "}
          {kind === "music"
            ? `artist sources / ${MUSIC_SOURCE_TARGET.toLocaleString()} target`
            : "video creators"}
        </p>
      )}
      {total !== null && (
        <p className="text-sm font-semibold">
          {kind === "music"
            ? `${total.toLocaleString()} distinct songs imported · ${target.toLocaleString()} benchmark (not a cap)`
            : `${total.toLocaleString()} / ${target.toLocaleString()} distinct video episodes`}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <PrimaryButton disabled={running} onClick={() => void run(false)}>
          Start / resume import
        </PrimaryButton>
        {running ? (
          <PrimaryButton
            onClick={() => {
              pause.current = true;
            }}
          >
            Pause import
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={() => void run(true)}>Scan again</PrimaryButton>
        )}
      </div>
    </section>
  );
}
