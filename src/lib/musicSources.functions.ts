import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { eligibleMusicVideo } from "./musicImport";
import {
  DISCOVERY_QUERIES,
  autoApprovable,
  faithSignal,
  pickBestChannel,
  qualifiesAsMusicSource,
  type ChannelSummary,
} from "./musicSourceResolver";
import candidateFile from "../../content/music-source-candidates.json";

/**
 * Adding artists to the catalogue from the admin screen.
 *
 * The CLI resolver needs YOUTUBE_API_KEY in the shell it runs from. This is
 * the same work driven from the browser instead, so the key can stay where
 * it belongs — server-only in the host environment — and nobody has to hold
 * a copy locally.
 *
 * One bounded step per call, so the admin screen can show progress and stop
 * without losing anything. A step is one candidate name or one discovery
 * query; the screen walks the cursor forward.
 *
 * The gates are the resolver's own, unchanged: a confident unambiguous name
 * match, at least three uploads that pass the importer's eligibility rules,
 * and for discovered channels a gospel signal in the channel's own words.
 * A wrong channel here feeds the wrong uploads to young people as worship.
 */

type Candidate = { name: string; languages: string[]; note?: string };
const CANDIDATES = (candidateFile as { candidates: Candidate[] }).candidates;

export const TOTAL_STEPS = CANDIDATES.length + DISCOVERY_QUERIES.length;

export const resolveMusicSourcesStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      /** Index into candidates, then into discovery queries after those. */
      step: z.number().int().min(0).max(10000).default(0),
      includeDiscovery: z.boolean().default(true),
    }),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      step: number;
      next: number | null;
      label: string;
      added: { name: string; languages: string[]; songs: number }[];
      skipped: { name: string; reason: string }[];
      totalSources: number;
      totalSteps: number;
    }> => {
      if (context.claims["aal"] !== "aal2")
        throw new Error("Verify your admin account with MFA before adding sources.");
      const { data: roles, error: roleError } = await context.supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId)
        .in("role", ["super_admin", "moderator"]);
      if (roleError || !roles?.length)
        throw new Error("Only Nuru administrators can add catalogue sources.");

      const key = process.env["YOUTUBE_API_KEY"];
      if (!key)
        throw new Error("Set the server-only YOUTUBE_API_KEY in Vercel and redeploy first.");

      async function call(path: string, params: Record<string, string>) {
        const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
        url.search = new URLSearchParams({ ...params, key: key! }).toString();
        const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!response.ok)
          throw new Error(
            `YouTube returned ${response.status}. Paused; check the key and quota, then resume.`,
          );
        return (await response.json()) as Record<string, unknown>;
      }

      const db = context.supabase;
      const { data: existing } = await db
        .from("media_sources")
        .select("name, youtube_channel_id")
        .not("youtube_channel_id", "is", null);
      const known = (existing ?? []) as { name: string; youtube_channel_id: string }[];
      const knownIds = new Set(known.map((row) => row.youtube_channel_id));

      async function searchChannels(term: string, max: number): Promise<ChannelSummary[]> {
        const found = (await call("search", {
          part: "snippet",
          q: term,
          type: "channel",
          maxResults: String(max),
          regionCode: "KE",
          relevanceLanguage: "sw",
        })) as { items?: { snippet?: { channelId?: string }; id?: { channelId?: string } }[] };
        const ids = (found.items ?? [])
          .map((i) => i.snippet?.channelId ?? i.id?.channelId)
          .filter((v): v is string => !!v);
        if (!ids.length) return [];
        const detail = (await call("channels", {
          part: "snippet,statistics",
          id: ids.join(","),
        })) as {
          items?: {
            id: string;
            snippet?: {
              title?: string;
              description?: string;
              thumbnails?: { high?: { url: string }; default?: { url: string } };
            };
          }[];
        };
        return (detail.items ?? []).map((c) => ({
          channelId: c.id,
          title: c.snippet?.title ?? "",
          description: c.snippet?.description ?? "",
          avatarUrl:
            c.snippet?.thumbnails?.high?.url ?? c.snippet?.thumbnails?.default?.url ?? null,
        }));
      }

      /** Eligible music uploads, by the importer's own rules. */
      async function sampleMusic(channelId: string) {
        const channel = (await call("channels", {
          part: "contentDetails",
          id: channelId,
        })) as { items?: { contentDetails?: { relatedPlaylists?: { uploads?: string } } }[] };
        const uploads = channel.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        if (!uploads) return [];
        const page = (await call("playlistItems", {
          part: "contentDetails",
          playlistId: uploads,
          maxResults: "25",
        })) as { items?: { contentDetails?: { videoId?: string } }[] };
        const ids = (page.items ?? [])
          .map((i) => i.contentDetails?.videoId)
          .filter((v): v is string => !!v);
        if (!ids.length) return [];
        const videos = (await call("videos", {
          part: "snippet,status,contentDetails",
          id: ids.join(","),
        })) as { items?: Parameters<typeof eligibleMusicVideo>[0][] };
        return (videos.items ?? []).filter((v) => eligibleMusicVideo(v, channelId));
      }

      async function addSource(channel: ChannelSummary, languages: string[], songs: number) {
        const { error } = await db.from("media_sources").insert({
          name: channel.title,
          source_type: "youtube",
          youtube_channel_id: channel.channelId,
          description:
            `Reviewed music creator. Language collections: ${languages.join(", ")}. ` +
            `Identity checked ${new Date().toISOString().slice(0, 10)}: ` +
            `https://www.youtube.com/channel/${channel.channelId}`,
          avatar_url: channel.avatarUrl ?? null,
          is_verified: true,
          is_approved: true,
          content_kind: "music",
          language_codes: languages,
        });
        // A duplicate means another step already added it; that is not a failure.
        if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message);
        knownIds.add(channel.channelId);
        return { name: channel.title, languages, songs };
      }

      const added: { name: string; languages: string[]; songs: number }[] = [];
      const skipped: { name: string; reason: string }[] = [];
      let label = "";

      if (data.step < CANDIDATES.length) {
        // A named candidate: a person already vouched for the name, so the
        // gate is the name match plus real music uploads.
        const candidate = CANDIDATES[data.step]!;
        label = candidate.name;
        const channels = await searchChannels(candidate.name, 5);
        const pick = pickBestChannel(candidate.name, channels);
        if (!pick.ok) skipped.push({ name: candidate.name, reason: pick.reason });
        else if (knownIds.has(pick.channel.channelId))
          skipped.push({ name: candidate.name, reason: "already in the catalogue" });
        else {
          const songs = await sampleMusic(pick.channel.channelId);
          if (!qualifiesAsMusicSource(songs.length))
            skipped.push({
              name: candidate.name,
              reason: `only ${songs.length} eligible music uploads`,
            });
          else added.push(await addSource(pick.channel, candidate.languages, songs.length));
        }
      } else if (data.includeDiscovery) {
        const query = DISCOVERY_QUERIES[data.step - CANDIDATES.length];
        if (query) {
          label = query.query;
          for (const channel of await searchChannels(query.query, 25)) {
            if (knownIds.has(channel.channelId)) continue;
            const songs = await sampleMusic(channel.channelId);
            if (!qualifiesAsMusicSource(songs.length)) continue;
            if (!autoApprovable(channel, songs.length)) {
              const signal = faithSignal(channel);
              skipped.push({
                name: channel.title,
                reason: signal.disqualified
                  ? `mentions "${signal.disqualified}"`
                  : "nothing says it is gospel",
              });
              continue;
            }
            added.push(await addSource(channel, query.languages, songs.length));
          }
        }
      }

      const { count } = await db
        .from("media_sources")
        .select("id", { head: true, count: "exact" })
        .eq("is_approved", true)
        .eq("content_kind", "music");

      const last = data.includeDiscovery ? TOTAL_STEPS : CANDIDATES.length;
      return {
        step: data.step,
        next: data.step + 1 < last ? data.step + 1 : null,
        label,
        added,
        skipped,
        totalSources: count ?? 0,
        totalSteps: last,
      };
    },
  );
