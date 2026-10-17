import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminWriteAssurance } from "./adminDirectoryAccess";
import { catalogueTarget } from "./catalogTargets";
import { processCatalogPage, type ImportStats } from "./musicCatalogEngine";

const kindSchema = z.enum(["music", "podcast"]);
const sourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  channelId: z.string(),
  languages: z
    .array(z.string())
    .nullable()
    .transform((value) => value ?? []),
  pageToken: z.string().nullable(),
  playlistId: z.string().nullable(),
});
const zeroStats = (): ImportStats => ({
  fetched: 0,
  parsed: 0,
  eligible: 0,
  inserted: 0,
  skippedExisting: 0,
  rejected: 0,
});
async function requireImporter(context: {
  supabase: SupabaseClient<Database>;
  userId: string;
  claims: { aal?: unknown };
}) {
  const roles = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .in("role", ["super_admin", "moderator"]);
  if (roles.error || !roles.data?.length)
    throw new Error("Only Nuru administrators can import the shared catalogue.");
}
function progressError(error: { code?: string; message?: string }) {
  return new Error(
    error.code === "PGRST202" || error.code === "42P01"
      ? "The importer checkpoint migration is not installed. Ask the administrator to complete the importer upgrade."
      : `Import checkpoint unavailable (${error.code ?? "database"}). Progress was preserved.`,
  );
}

export const getCatalogImportDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ kind: kindSchema.default("music") }))
  .handler(async ({ data, context }) => {
    await requireImporter(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const [summary, progress] = await Promise.all([
      db.rpc("media_catalog_scan_summary", { p_kind: data.kind }),
      db
        .from("media_catalog_imports")
        .select("status,last_error,updated_at,imported_total")
        .eq("kind", data.kind)
        .single(),
    ]);
    if (summary.error) throw progressError(summary.error);
    if (progress.error) throw progressError(progress.error);
    return {
      summary: z
        .object({
          sourceTotal: z.number(),
          completedSources: z.number(),
          pages: z.number(),
          fetched: z.number(),
          inserted: z.number(),
          skippedExisting: z.number(),
          rejected: z.number(),
          durationMs: z.number(),
          recent: z.array(
            z.object({
              name: z.string(),
              channel_id: z.string(),
              completed: z.boolean(),
              pages_processed: z.number(),
              inserted: z.number(),
              skipped_existing: z.number(),
              rejected: z.number(),
              updated_at: z.string(),
            }),
          ),
        })
        .parse(summary.data),
      progress: progress.data,
    };
  });

/** One fenced, resumable source page. Completed creators are excluded by default. */
export const importReviewedCatalogPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      kind: kindSchema.default("music"),
      restart: z.boolean().default(false),
      refreshTotal: z.boolean().default(false),
      channelIds: z
        .array(z.string().regex(/^UC[A-Za-z0-9_-]{22}$/))
        .max(200)
        .default([]),
    }),
  )
  .handler(async ({ data, context }) => {
    await requireImporter(context);
    assertAdminWriteAssurance(context.claims.aal);
    if (data.restart && !data.channelIds.length)
      throw new Error("Select specific creators before explicitly rescanning their history.");
    const key = process.env["YOUTUBE_API_KEY"];
    if (!key) throw new Error("YouTube API is not configured on the server.");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const leaseToken = crypto.randomUUID(),
      started = Date.now();
    const { data: progress, error: leaseError } = await db
      .from("media_catalog_imports")
      .update({ lease_token: leaseToken, lease_until: new Date(Date.now() + 90000).toISOString() })
      .eq("kind", data.kind)
      .or(`lease_until.is.null,lease_until.lt.${new Date().toISOString()}`)
      .select("*")
      .maybeSingle();
    if (leaseError) throw progressError(leaseError);
    if (!progress) throw new Error("Another import batch is running. Wait before resuming.");
    async function nextSource() {
      const result = await db.rpc("next_media_catalog_source", {
        p_kind: data.kind,
        p_channel_ids: data.channelIds,
      });
      if (result.error) throw progressError(result.error);
      return sourceSchema.nullable().parse(result.data);
    }
    try {
      let before = progress.imported_total;
      // Count once at the start of a user run, not twice for every 50-upload page.
      if (data.refreshTotal) {
        const count = await db
          .from("media_items")
          .select("id", { head: true, count: "exact" })
          .eq("source", "youtube")
          .eq("media_type", data.kind)
          .eq("is_approved", true);
        if (count.error) throw new Error("Catalogue count is unavailable; retry later.");
        before = count.count ?? 0;
        const sync = await db
          .from("media_catalog_imports")
          .update({ imported_total: before })
          .eq("kind", data.kind)
          .eq("lease_token", leaseToken)
          .select("kind")
          .single();
        if (sync.error) throw progressError(sync.error);
      }
      if (data.restart) {
        const reset = await db.rpc("reset_media_catalog_sources", {
          p_kind: data.kind,
          p_channel_ids: data.channelIds,
          p_lease: leaseToken,
        });
        if (reset.error) throw progressError(reset.error);
      }
      if (data.kind !== "music" && before >= catalogueTarget(data.kind))
        return {
          total: before,
          added: 0,
          next: null,
          targetReached: true,
          stats: zeroStats(),
          sourceName: null,
          durationMs: Date.now() - started,
        };
      const source = await nextSource();
      if (!source) {
        const end = await db
          .from("media_catalog_imports")
          .update({
            status: data.channelIds.length ? "complete" : "exhausted",
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq("kind", data.kind)
          .eq("lease_token", leaseToken)
          .select("kind")
          .single();
        if (end.error) throw progressError(end.error);
        return {
          total: before,
          added: 0,
          next: null,
          targetReached: false,
          stats: zeroStats(),
          sourceName: null,
          durationMs: Date.now() - started,
        };
      }
      const result = await processCatalogPage({
        kind: data.kind,
        source,
        call: async (path, params) => {
          const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
          url.search = new URLSearchParams({ ...params, key }).toString();
          const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
          if (!response.ok)
            throw new Error(
              `YouTube returned ${response.status}. Import paused; saved pages were retained. Check quota or an expired page token before resuming.`,
            );
          return response.json();
        },
        existingIds: async (ids) => {
          const known = await db
            .from("media_items")
            .select("external_id")
            .eq("source", "youtube")
            .in("external_id", ids);
          if (known.error)
            throw new Error("Could not check existing uploads. Import paused before advancing.");
          return new Set(
            (known.data ?? []).map((row) => row.external_id).filter((id): id is string => !!id),
          );
        },
        insert: async (rows) => {
          const inserted = await db
            .from("media_items")
            .upsert(rows, { onConflict: "source,external_id", ignoreDuplicates: true })
            .select("id");
          if (inserted.error)
            throw new Error(
              `Catalogue insert failed (${inserted.error.code}). The saved page was retained.`,
            );
          return inserted.data?.length ?? 0;
        },
      });
      const checkpoint = await db.rpc("checkpoint_media_catalog_source", {
        p_kind: data.kind,
        p_channel_id: source.channelId,
        p_lease: leaseToken,
        p_expected_token: source.pageToken,
        p_next_token: result.nextPageToken,
        p_playlist_id: result.playlistId,
        p_stats: result.stats,
        p_duration_ms: Date.now() - started,
      });
      if (checkpoint.error) throw progressError(checkpoint.error);
      const next = await nextSource();
      const total = before + result.stats.inserted;
      const targetReached = data.kind !== "music" && total >= catalogueTarget(data.kind);
      if (!next || targetReached) {
        const end = await db
          .from("media_catalog_imports")
          .update({
            status: targetReached || data.channelIds.length ? "complete" : "exhausted",
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq("kind", data.kind)
          .eq("lease_token", leaseToken)
          .select("kind")
          .single();
        if (end.error) throw progressError(end.error);
      }
      return {
        total,
        added: result.stats.inserted,
        next:
          targetReached || !next ? null : { channelId: next.channelId, pageToken: next.pageToken },
        targetReached,
        stats: result.stats,
        sourceName: source.name,
        durationMs: Date.now() - started,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Catalogue import paused.";
      await db
        .from("media_catalog_imports")
        .update({ status: "paused", last_error: message, updated_at: new Date().toISOString() })
        .eq("kind", data.kind)
        .eq("lease_token", leaseToken);
      throw new Error(message);
    } finally {
      await db
        .from("media_catalog_imports")
        .update({ lease_token: null, lease_until: null })
        .eq("kind", data.kind)
        .eq("lease_token", leaseToken);
    }
  });
