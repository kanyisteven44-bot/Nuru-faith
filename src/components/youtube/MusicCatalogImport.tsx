import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { importMusicCatalogPage } from "@/lib/musicCatalog.functions";
import { PrimaryButton } from "@/components/nuru/Primitives";

type Cursor = { channelId: string | null; pageToken: string | null };
const STORAGE_KEY = "nuru-music-import-v1";
export function MusicCatalogImport() {
  const client = useQueryClient();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState(
    "Import distinct songs from approved official music channels.",
  );
  const [total, setTotal] = useState<number | null>(null);
  const pause = useRef(false);
  const active = useRef(false);
  useEffect(
    () => () => {
      pause.current = true;
    },
    [],
  );
  async function run(fresh: boolean) {
    if (active.current) return;
    active.current = true;
    pause.current = false;
    setRunning(true);
    let cursor: Cursor = { channelId: null, pageToken: null };
    try {
      if (!fresh) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (
            (typeof parsed.channelId === "string" || parsed.channelId === null) &&
            (typeof parsed.pageToken === "string" || parsed.pageToken === null)
          )
            cursor = parsed;
        }
      } else localStorage.removeItem(STORAGE_KEY);
      while (!pause.current) {
        const result = await importMusicCatalogPage({ data: cursor });
        setTotal(result.total);
        await client.invalidateQueries({ queryKey: ["media-catalog"] });
        if (!result.next) {
          localStorage.removeItem(STORAGE_KEY);
          setMessage(
            result.targetReached
              ? "10,000-song target reached."
              : "Approved sources exhausted below 10,000. Review and add more official music channels; existing songs have not been duplicated.",
          );
          break;
        }
        cursor = result.next;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cursor));
        setMessage(
          "Importing verified music metadata. Keep this page open, or pause and resume later.",
        );
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
      <h2 className="font-display text-lg font-semibold">Music catalogue import</h2>
      <p className="text-sm text-muted-foreground" role="status">
        {message}
      </p>
      {total !== null && (
        <p className="text-sm font-semibold">{total.toLocaleString()} / 10,000 distinct songs</p>
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
