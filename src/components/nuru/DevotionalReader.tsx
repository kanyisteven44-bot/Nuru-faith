import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchPassage, DEFAULT_TRANSLATION } from "@/lib/bible";
import { resolveMedia } from "@/lib/media";
import { AppShell } from "./AppShell";
import { CoverImage } from "./CoverImage";
import { ReadingTools } from "./ReadingTools";
import { CardSkeleton } from "./Primitives";

export function DevotionalReader({ id }: { id: string }) {
  const [fontSize, setFontSize] = useState(18);
  const devotional = useQuery({
    queryKey: ["devotional", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devotionals")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const row = devotional.data;
  const body = (row?.body ?? "").replace(/\\n/g, "\n");
  const scripture = useQuery({
    queryKey: ["passage", row?.scripture_ref, DEFAULT_TRANSLATION],
    enabled: !!row?.scripture_ref,
    queryFn: () => fetchPassage(row!.scripture_ref!, DEFAULT_TRANSLATION),
    staleTime: Infinity,
    retry: 1,
  });
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
        <Link
          to="/devotionals"
          search={{ reading: undefined }}
          className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> All devotionals
        </Link>
        {devotional.isPending ? (
          <CardSkeleton count={3} height="h-24" />
        ) : devotional.isError ? (
          <div role="alert" className="nuru-card p-6">
            <p>This devotional could not load.</p>
            <button
              className="mt-3 min-h-11 text-primary underline"
              onClick={() => void devotional.refetch()}
            >
              Retry devotional
            </button>
          </div>
        ) : !row ? (
          <p>This devotional is unavailable.</p>
        ) : (
          <>
            <header className="relative mb-6 overflow-hidden rounded-3xl">
              <CoverImage
                src={resolveMedia(row.cover_url)}
                alt=""
                className="absolute inset-0 h-full w-full"
              />
              <div className="relative bg-gradient-to-t from-black/90 to-black/30 px-6 pt-24 pb-7 text-white sm:px-8">
                <p className="text-xs font-semibold tracking-widest uppercase">
                  A moment with God · {row.read_minutes ?? 5} min read
                </p>
                <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
                  {row.title}
                </h1>
                {row.subtitle && <p className="mt-3 text-sm text-white/85">{row.subtitle}</p>}
              </div>
            </header>
            <ReadingTools
              fontSize={fontSize}
              onFontSize={setFontSize}
              text={
                scripture.isFetching
                  ? ""
                  : [row.title, scripture.data?.text ?? row.scripture_text, body]
                      .filter(Boolean)
                      .join("\n\n")
              }
            />
            <article
              className="nuru-reader-copy rounded-3xl border border-border bg-surface p-6 sm:p-8"
              style={{ fontSize }}
            >
              {row.scripture_ref && (
                <section
                  className="mb-8 border-b border-border pb-6"
                  aria-label="Devotional Scripture"
                >
                  <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-primary">
                    <BookOpen className="h-5 w-5" /> {row.scripture_ref}
                  </h2>
                  {scripture.isPending ? (
                    <p role="status">Loading Scripture…</p>
                  ) : scripture.isError ? (
                    <div role="alert">
                      <p>The Scripture text could not load.</p>
                      <button
                        type="button"
                        className="min-h-11 text-sm text-primary underline"
                        onClick={() => void scripture.refetch()}
                      >
                        Retry Scripture
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="font-display whitespace-pre-line">{scripture.data?.text}</p>
                      <p className="mt-3 text-xs! text-muted-foreground">
                        {scripture.data?.translation}
                      </p>
                    </>
                  )}
                </section>
              )}
              {body
                .split(/\n\s*\n/)
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index} className="mb-6 whitespace-pre-line">
                    {paragraph}
                  </p>
                ))}
            </article>
            <Link
              to="/devotionals"
              search={{ reading: undefined }}
              className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-border px-5 text-sm font-semibold"
            >
              Choose another devotional
            </Link>
          </>
        )}
      </div>
    </AppShell>
  );
}
