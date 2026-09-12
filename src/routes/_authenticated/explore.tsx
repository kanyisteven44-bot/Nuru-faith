import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import {
  DISCOVERY_KINDS,
  DISCOVERY_LABELS,
  SUGGESTED_SEARCHES,
  normalizeSearch,
  type DiscoveryKind,
} from "@/lib/content-policy";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { DiscoveryResults } from "@/components/nuru/DiscoveryResults";
import { EmptyState } from "@/components/nuru/Primitives";

const schema = z.object({
  q: z.string().max(120).catch(""),
  kind: z.enum(["all", ...DISCOVERY_KINDS]).catch("all"),
});
export const Route = createFileRoute("/_authenticated/explore")({
  validateSearch: (value) => schema.parse(value),
  head: () => ({
    meta: [
      { title: "Explore — Nuru Faith" },
      {
        name: "description",
        content: "Discover Scripture, churches, groups and approved Christian media.",
      },
    ],
  }),
  component: ExploreScreen,
});
function ExploreScreen() {
  const { userId } = useAuth();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [input, setInput] = useState(search.q);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => setInput(search.q), [search.q]);
  useEffect(() => {
    const timer = setTimeout(() => {
      const q = normalizeSearch(input);
      if (q !== search.q) void navigate({ search: { ...search, q }, replace: true });
    }, 400);
    return () => clearTimeout(timer);
  }, [input, navigate, search]);
  useEffect(() => {
    setRecent([]);
    if (!userId) return;
    try {
      const value: unknown = JSON.parse(localStorage.getItem(`nuru-searches:${userId}`) ?? "[]");
      if (Array.isArray(value))
        setRecent(value.filter((q): q is string => typeof q === "string").slice(0, 6));
    } catch {
      /* Search remains usable when storage is unavailable. */
    }
  }, [userId]);
  const [emptyKinds, setEmptyKinds] = useState<Partial<Record<DiscoveryKind, boolean>>>({});
  useEffect(() => setEmptyKinds({}), [search.q, search.kind]);
  const markEmpty = useCallback((kind: DiscoveryKind, empty: boolean) => {
    setEmptyKinds((prev) => (prev[kind] === empty ? prev : { ...prev, [kind]: empty }));
  }, []);
  const emptyHandlers = useMemo(
    () =>
      Object.fromEntries(
        DISCOVERY_KINDS.map((kind) => [kind, (empty: boolean) => markEmpty(kind, empty)]),
      ) as Record<DiscoveryKind, (empty: boolean) => void>,
    [markEmpty],
  );
  const nothingMatched =
    search.kind === "all" && DISCOVERY_KINDS.every((kind) => emptyKinds[kind] === true);

  function remember(value: string) {
    const q = normalizeSearch(value);
    setInput(q);
    if (!q || !userId) return;
    const next = [q, ...recent.filter((old) => old.toLowerCase() !== q.toLowerCase())].slice(0, 6);
    setRecent(next);
    try {
      localStorage.setItem(`nuru-searches:${userId}`, JSON.stringify(next));
    } catch {
      /* Optional device recents. */
    }
    void navigate({ search: { ...search, q }, replace: true });
  }
  return (
    <AppShell>
      <ScreenHeader title="Explore" subtitle="Find your next step in faith" />
      <div className="space-y-3 px-4 py-4">
        <form
          className="relative"
          onSubmit={(event) => {
            event.preventDefault();
            remember(input);
          }}
        >
          <Search className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-muted-foreground" />
          <input
            aria-label="Search Nuru Faith"
            className="input-nuru pl-11"
            placeholder="Search faith, people and teachings"
            maxLength={120}
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </form>
        <div
          aria-label="Content categories"
          className="no-scrollbar flex gap-2 overflow-x-auto pb-1"
        >
          {(["all", ...DISCOVERY_KINDS] as const).map((kind) => (
            <button
              key={kind}
              aria-pressed={search.kind === kind}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-xs ${search.kind === kind ? "border-cyan bg-surface-2 text-cyan" : "border-border"}`}
              onClick={() => void navigate({ search: { ...search, kind } })}
            >
              {kind === "all" ? "All" : DISCOVERY_LABELS[kind]}
            </button>
          ))}
        </div>
        {!search.q && (
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Suggested searches</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_SEARCHES.map((q) => (
                <button
                  className="min-h-11 rounded-full bg-surface-2 px-3 text-xs"
                  key={q}
                  onClick={() => remember(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {recent.length > 0 && (
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Recent searches on this device</p>
              <button
                className="min-h-11 px-2 text-xs text-cyan"
                onClick={() => {
                  setRecent([]);
                  try {
                    localStorage.removeItem(`nuru-searches:${userId}`);
                  } catch {
                    /* Optional storage. */
                  }
                }}
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recent.map((q) => (
                <button
                  className="min-h-11 max-w-full break-words rounded-full border border-border px-3 text-xs"
                  key={q}
                  onClick={() => remember(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div aria-live="polite">
        {(search.kind === "all" ? DISCOVERY_KINDS : [search.kind]).map((kind) => (
          <DiscoveryResults
            key={kind}
            kind={kind}
            query={search.q}
            userId={userId}
            hideWhenEmpty={search.kind === "all"}
            onEmptyChange={emptyHandlers[kind]}
          />
        ))}
        {nothingMatched && (
          <div className="px-4 pb-5">
            <EmptyState
              title={search.q ? `Nothing found for "${search.q}"` : "Nothing to show yet"}
              description={
                search.q
                  ? "Try another word or topic, or pick a category above."
                  : "Approved content will appear here as churches and the Nuru team add it."
              }
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
