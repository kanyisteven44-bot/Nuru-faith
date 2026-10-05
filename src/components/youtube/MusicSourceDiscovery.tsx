import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { resolveMusicSourcesStep } from "@/lib/musicSources.functions";
import { PrimaryButton } from "@/components/nuru/Primitives";

/**
 * Adds artists to the catalogue from the browser, so the YouTube key can
 * stay server-side instead of being copied onto someone's laptop to run the
 * CLI resolver.
 *
 * One step per request — a candidate name, or a discovery search — so a long
 * run shows progress and can be stopped without losing what it already
 * found. Nothing is approved that has not cleared the resolver's gates.
 */
export function MusicSourceDiscovery() {
  const client = useQueryClient();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState(
    "Verify reviewed artist names against YouTube and add the ones that check out. Admin MFA is required.",
  );
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [sources, setSources] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const pause = useRef(false);
  const active = useRef(false);

  async function run() {
    if (active.current) return;
    active.current = true;
    pause.current = false;
    setRunning(true);
    setLog([]);
    let step = 0;
    let addedTotal = 0;
    try {
      for (;;) {
        if (pause.current) {
          setMessage(`Paused at step ${step}. Start again to continue from the beginning.`);
          break;
        }
        const result = await resolveMusicSourcesStep({
          data: { step, includeDiscovery: true },
        });
        setProgress({ done: result.step + 1, total: result.totalSteps });
        setSources(result.totalSources);
        addedTotal += result.added.length;

        if (result.added.length) {
          setLog((lines) =>
            [
              ...result.added.map(
                (a) => `Added ${a.name} (${a.languages.join(", ")}) — ${a.songs}+ songs`,
              ),
              ...lines,
            ].slice(0, 60),
          );
          await client.invalidateQueries({ queryKey: ["media-directory"] });
        } else if (result.skipped.length) {
          setLog((lines) =>
            [`Skipped ${result.skipped[0]!.name}: ${result.skipped[0]!.reason}`, ...lines].slice(
              0,
              60,
            ),
          );
        }

        if (result.next === null) {
          setMessage(
            `Finished. ${addedTotal} new artist${addedTotal === 1 ? "" : "s"} added. ` +
              `Run the catalogue import next to pull their songs.`,
          );
          break;
        }
        step = result.next;
        setMessage(`Checking "${result.label}". Keep this page open, or pause and come back.`);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `${error.message} Artists already added are saved.`
          : "Stopped. Artists already added are saved.",
      );
    } finally {
      active.current = false;
      setRunning(false);
    }
  }

  return (
    <section className="nuru-card space-y-3 p-4">
      <h2 className="font-display text-lg font-semibold">Add music artists</h2>
      <p className="text-sm text-muted-foreground">
        Checks the reviewed candidate names, then searches gospel terms in each language. An artist
        is only added when the channel is a confident match, publishes real music, and says for
        itself that it is gospel.
      </p>
      <p className="text-sm text-muted-foreground" role="status">
        {message}
      </p>
      {progress && (
        <p className="text-sm font-semibold">
          Step {progress.done} of {progress.total}
          {sources !== null && ` · ${sources.toLocaleString()} music artists in the catalogue`}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <PrimaryButton disabled={running} onClick={() => void run()}>
          {running ? "Checking…" : "Find and add artists"}
        </PrimaryButton>
        {running && (
          <PrimaryButton
            onClick={() => {
              pause.current = true;
            }}
          >
            Pause
          </PrimaryButton>
        )}
      </div>
      {log.length > 0 && (
        <ul className="max-h-56 space-y-1 overflow-y-auto text-[12.5px] text-muted-foreground">
          {log.map((line, i) => (
            <li key={`${line}-${i}`}>{line}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
