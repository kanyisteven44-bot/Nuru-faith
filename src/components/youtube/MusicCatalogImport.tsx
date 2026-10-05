import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { importMusicCatalogPage } from "@/lib/musicCatalog.functions";
import { MfaChallenge } from "@/components/nuru/MfaSecurity";
import { supabase } from "@/integrations/supabase/client";
import { PrimaryButton } from "@/components/nuru/Primitives";

type Cursor = { channelId: string | null; pageToken: string | null };
export function MusicCatalogImport() {
  const client = useQueryClient();
  const [kind, setKind] = useState<"music" | "podcast">("music");
  const STORAGE_KEY = `nuru-media-import-v2-${kind}`;
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState(
    "Import distinct videos from reviewed sources. Admin MFA is required.",
  );
  const [needsVerification, setNeedsVerification] = useState(false);
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
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.error) throw new Error(assurance.error.message);
      if (assurance.data.currentLevel !== "aal2") {
        setNeedsVerification(true);
        setMessage("Verify your administrator session to import songs and video episodes.");
        return;
      }
      setNeedsVerification(false);
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
        const result = await importMusicCatalogPage({ data: { ...cursor, kind } });
        setTotal(result.total);
        await client.invalidateQueries({ queryKey: ["media-catalog"] });
        if (!result.next) {
          localStorage.removeItem(STORAGE_KEY);
          setMessage(
            result.targetReached
              ? "10,000-video target reached."
              : "Reviewed sources exhausted below the target. Add more reviewed creators to continue; entries have not been duplicated.",
          );
          break;
        }
        cursor = result.next;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cursor));
        setMessage("Importing video metadata. Keep this page open, or pause and resume later.");
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
      <p className="text-sm text-muted-foreground" role="status">
        {message}
      </p>
      {total !== null && (
        <p className="text-sm font-semibold">
          {total.toLocaleString()} / 10,000 distinct {kind === "music" ? "songs" : "video episodes"}
        </p>
      )}
      {needsVerification && (
        <MfaChallenge
          title="Verify catalogue import"
          onSuccess={() => {
            setNeedsVerification(false);
            void run(false);
          }}
        />
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
