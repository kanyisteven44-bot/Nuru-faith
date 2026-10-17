import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Users, CheckCircle2, Loader2 } from "lucide-react";
import {
  adminYouTubeSearch,
  approveYouTubeSource,
  resolveYouTubeCreatorLink,
} from "@/lib/mediaAdmin.functions";
import { reviewedSingerIds } from "@/lib/singerImport";
import { mapImportInputs } from "@/lib/importConcurrency";
import { supabase } from "@/integrations/supabase/client";
import { MfaChallenge } from "@/components/nuru/MfaSecurity";

type Singer = {
  channelId: string;
  title: string;
  description: string;
  thumbnail: string;
  subscriberCount: string | null;
};
export function SingerImport() {
  const client = useQueryClient();
  const [query, setQuery] = useState("");
  const [links, setLinks] = useState("");
  const [candidates, setCandidates] = useState<Singer[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [language, setLanguage] = useState("en");
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const [message, setMessage] = useState(
    "Find exact singer channels, review them, then add your selection. This does not start a song scan.",
  );
  const [needsMfa, setNeedsMfa] = useState(false);
  async function discover(mode: "search" | "links") {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setSelected(new Set());
    try {
      if (mode === "search") {
        const result = await adminYouTubeSearch({
          data: { query: query.trim(), type: "channel", maxResults: 20 },
        });
        setCandidates(result.channels);
        setMessage(
          `${result.channels.length} channels found. Confirm each is the intended gospel singer before selecting it.`,
        );
      } else {
        const entries = [
          ...new Set(
            links
              .split(/[\n,]+/)
              .map((value) => value.trim())
              .filter(Boolean),
          ),
        ];
        if (!entries.length || entries.length > 25)
          throw new Error("Paste between 1 and 25 creator links, one per line.");
        const resolved = await mapImportInputs(entries, (input) =>
          resolveYouTubeCreatorLink({ data: { input } }),
        );
        const singers = resolved.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : [],
        );
        setCandidates([...new Map(singers.map((singer) => [singer.channelId, singer])).values()]);
        const failed = resolved.flatMap((result, index) =>
          result.status === "rejected"
            ? [
                `${entries[index]}: ${result.reason instanceof Error ? result.reason.message : "Could not resolve"}`,
              ]
            : [],
        );
        setMessage(
          `${singers.length} links resolved; ${failed.length} failed.${failed.length ? ` ${failed.join(" · ")}` : " Review channels before adding them."}`,
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Singer lookup failed.");
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  async function importSingers() {
    if (active.current || !selected.size) return;
    active.current = true;
    setBusy(true);
    try {
      if (!/^[a-z]{2,3}$/.test(language.trim()))
        throw new Error("Use a two- or three-letter language code, such as en, sw or kik.");
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.error || assurance.data.currentLevel !== "aal2") {
        setNeedsMfa(true);
        throw new Error("Verify your authenticator before approving singers.");
      }
      const ids = candidates
        .filter((item) => selected.has(item.channelId))
        .map((item) => item.channelId);
      const [sources, trust] = await Promise.all([
        supabase
          .from("media_sources")
          .select("youtube_channel_id,is_approved,is_verified,content_kind")
          .in("youtube_channel_id", ids),
        supabase
          .from("approved_youtube_channels")
          .select("channel_id,is_verified,trust_level")
          .in("channel_id", ids),
      ]);
      if (sources.error || trust.error)
        throw new Error(
          "Existing singer review could not be checked. No approvals were changed; retry later.",
        );
      const reviewed = reviewedSingerIds(sources.data ?? [], trust.data ?? []);
      let existing = 0;
      let added = 0;
      const failures: string[] = [];
      for (const singer of candidates.filter((item) => selected.has(item.channelId))) {
        setMessage(`Adding ${singer.title}… ${added} confirmed so far.`);
        try {
          if (!reviewed.has(singer.channelId))
            await approveYouTubeSource({
              data: {
                channelId: singer.channelId,
                contentKind: "music",
                languageCodes: [language.trim()],
              },
            });
          if (reviewed.has(singer.channelId)) existing++;
          else added++;
          setSelected((current) => {
            const next = new Set(current);
            next.delete(singer.channelId);
            return next;
          });
        } catch (error) {
          failures.push(`${singer.title}: ${error instanceof Error ? error.message : "Failed"}`);
        }
      }
      await Promise.all([
        client.invalidateQueries({ queryKey: ["catalog-import-dashboard"] }),
        client.invalidateQueries({ queryKey: ["admin-media-workspace-summary"] }),
        client.invalidateQueries({ queryKey: ["media-directory"] }),
      ]);
      setMessage(
        `${added} singer sources approved · ${existing} already reviewed and unchanged. ${failures.length ? `${failures.length} failed and remain selected: ${failures.join(" · ")}` : "Open Songs and resume to scan their uploads."}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Singer import failed.");
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <Users className="mb-2 h-6 w-6 text-primary" />
        <h3 className="font-display text-xl font-bold">Build your singer directory</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Search by name or resolve up to 25 YouTube links. Preview first, select the right
          channels, then approve singers without importing their songs.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold">
          Find singers by name
          <input
            className="input-nuru"
            value={query}
            disabled={busy}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Gospel singer or official channel"
          />
          <button
            type="button"
            disabled={busy || query.trim().length < 2}
            onClick={() => void discover("search")}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            Search channels
          </button>
        </label>
        <label className="space-y-2 text-sm font-semibold">
          Import from creator links
          <textarea
            className="input-nuru min-h-24"
            value={links}
            disabled={busy}
            onChange={(event) => setLinks(event.target.value)}
            placeholder="@singer or https://youtube.com/@singer"
          />
          <button
            type="button"
            disabled={busy || !links.trim()}
            onClick={() => void discover("links")}
            className="min-h-11 rounded-xl border border-border px-4 disabled:opacity-50"
          >
            Resolve links
          </button>
        </label>
      </div>
      <p role="status" className="rounded-xl bg-surface-2 p-4 text-sm leading-relaxed">
        {message}
      </p>
      {needsMfa && (
        <MfaChallenge
          onSuccess={() => {
            setNeedsMfa(false);
            setMessage("Authenticator verified. Review your selection and add singers.");
          }}
        />
      )}
      {candidates.length > 0 && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {candidates.length} unique channels · {selected.size} selected
            </p>
            <label className="text-xs">
              Primary language code
              <input
                className="input-nuru mt-1 w-32"
                maxLength={3}
                disabled={busy}
                value={language}
                onChange={(event) => setLanguage(event.target.value.toLowerCase())}
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {candidates.map((singer) => (
              <label
                key={singer.channelId}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${selected.has(singer.channelId) ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5"
                  disabled={busy}
                  checked={selected.has(singer.channelId)}
                  onChange={(event) =>
                    setSelected((current) => {
                      const next = new Set(current);
                      event.target.checked
                        ? next.add(singer.channelId)
                        : next.delete(singer.channelId);
                      return next;
                    })
                  }
                />
                {singer.thumbnail && (
                  <img
                    src={singer.thumbnail}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-11 w-11 rounded-full object-cover"
                  />
                )}
                <span className="min-w-0">
                  <span className="block font-semibold">{singer.title}</span>
                  <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                    {singer.description || "No channel description supplied."}
                  </span>
                  <a
                    className="mt-2 inline-block min-h-8 text-xs text-primary underline"
                    href={`https://www.youtube.com/channel/${singer.channelId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Check official channel
                  </a>
                </span>
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={busy || !selected.size}
            onClick={() => void importSingers()}
            className="flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Add {selected.size} selected singer{selected.size === 1 ? "" : "s"}
          </button>
        </>
      )}
    </div>
  );
}
