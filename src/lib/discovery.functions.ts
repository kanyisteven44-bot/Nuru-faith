import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enforceNuruRateLimit } from "./rateLimit";
import { BIBLE_TOPICS, DISCOVERY_KINDS, searchFilter, type DiscoveryKind } from "./content-policy";

export type DiscoveryItem = {
  id: string;
  kind: DiscoveryKind;
  title: string;
  description: string;
  image: string | null;
  reference: string | null;
  slug: string | null;
  source: string | null;
  externalId: string | null;
  audioUrl: string | null;
  sourceUrl?: string | null;
  location?: string | null;
  creatorName?: string | null;
  durationSeconds?: number | null;
  category?: string | null;
};
const input = z.object({
  kind: z.enum(DISCOVERY_KINDS),
  query: z.string().trim().max(120).default(""),
  page: z.number().int().min(0).max(10000).default(0),
  id: z.string().max(80).optional(),
  county: z.string().trim().max(80).default("all"),
});
const PAGE_SIZE = 8;
export const searchDiscovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => input.parse(value))
  .handler(async ({ data, context }): Promise<{ items: DiscoveryItem[]; hasMore: boolean }> => {
    const { supabase } = context;
    const { kind, query, page, id, county } = data;

    if (!id) {
      await enforceNuruRateLimit(
        supabase,
        "discovery_search",
        "You have searched very quickly. Please wait a moment and continue.",
      );
    }
    const start = page * PAGE_SIZE;
    const base = (
      itemId: string,
      title: string,
      description: string | null,
      image: string | null,
    ): DiscoveryItem => ({
      id: itemId,
      kind,
      title,
      description: description ?? "",
      image,
      reference: null,
      slug: null,
      source: null,
      externalId: null,
      audioUrl: null,
      creatorName: null,
      durationSeconds: null,
      category: null,
    });
    let items: DiscoveryItem[] = [];
    if (kind === "bible") {
      items = BIBLE_TOPICS.filter((topic) =>
        id
          ? topic.id === id
          : `${topic.title} ${topic.reference}`.toLowerCase().includes(query.toLowerCase()),
      ).map((topic) => ({
        ...base(topic.id, topic.title, topic.reference, null),
        reference: topic.reference,
      }));
      return { items, hasMore: false };
    }
    if (id && !z.string().uuid().safeParse(id).success) return { items: [], hasMore: false };
    switch (kind) {
      case "profile": {
        let q = supabase.from("profiles").select("id,full_name,username,bio,avatar_url");
        if (id) q = q.eq("id", id);
        else if (query) q = q.or(searchFilter(["full_name", "username", "bio"], query));
        const { data: rows, error } = await q
          .order("full_name", { nullsFirst: false })
          .order("username", { nullsFirst: false })
          .order("id")
          .range(start, start + PAGE_SIZE);
        if (error) throw error;
        items = (rows ?? []).map((r) => {
          const displayName = r.full_name?.trim() || r.username?.trim() || "Nuru member";
          const handle = r.username ? `@${r.username}` : "Choose a username";
          const description = [handle, r.bio].filter(Boolean).join(" · ");
          return base(r.id, displayName, description, r.avatar_url);
        });
        break;
      }
      case "reels": {
        let q = supabase
          .from("reels")
          .select("id,caption,creator_name,poster_url,scripture_ref")
          .eq("status", "published")
          .eq("is_public", true);
        if (id) q = q.eq("id", id);
        else if (query)
          q = q.or(searchFilter(["caption", "topic", "scripture_ref", "creator_name"], query));
        const { data: rows, error } = await q
          .order("created_at", { ascending: false })
          .order("id")
          .range(start, start + PAGE_SIZE);
        if (error) throw error;
        items = (rows ?? []).map((r) => ({
          ...base(r.id, r.caption ?? "Reel", r.creator_name, r.poster_url),
          reference: r.scripture_ref,
          creatorName: r.creator_name,
        }));
        break;
      }
      case "series": {
        let q = supabase
          .from("scripture_series")
          .select("id,title,description,cover_image,slug")
          .eq("status", "published");
        if (id) q = q.eq("id", id);
        else if (query) q = q.or(searchFilter(["title", "description", "category"], query));
        const { data: rows, error } = await q
          .order("is_featured", { ascending: false })
          .order("id")
          .range(start, start + PAGE_SIZE);
        if (error) throw error;
        items = (rows ?? []).map((r) => ({
          ...base(r.id, r.title, r.description, r.cover_image),
          slug: r.slug,
        }));
        break;
      }
      case "churches": {
        let q = supabase
          .from("churches")
          .select("id,name,description,cover_url,region,city,denomination,country");
        if (!id && county !== "all") q = q.eq("country", "Kenya").eq("region", county);
        if (id) q = q.eq("id", id);
        else if (query) q = q.or(searchFilter(["name", "region", "city", "denomination"], query));
        const { data: rows, error } = await q
          .order("region", { nullsFirst: false })
          .order("city", { nullsFirst: false })
          .order("denomination", { nullsFirst: false })
          .order("name")
          .order("id")
          .range(start, start + PAGE_SIZE);
        if (error) throw error;
        items = (rows ?? []).map((r) => ({
          ...base(
            r.id,
            r.name,
            [r.region, r.city, r.denomination, r.description].filter(Boolean).join(" · "),
            r.cover_url,
          ),
          location:
            [r.city, r.region ? `${r.region} County` : null, r.country]
              .filter(Boolean)
              .join(" · ") || "Area not recorded",
          sourceUrl:
            r.description?.match(
              /https:\/\/www\.openstreetmap\.org\/(?:node|way|relation)\/\d+\b/,
            )?.[0] ?? null,
        }));
        break;
      }
      case "groups": {
        let q = supabase.from("groups").select("id,name,description,cover_url");
        if (id) q = q.eq("id", id);
        else if (query) q = q.or(searchFilter(["name", "description", "category"], query));
        const { data: rows, error } = await q.order("id").range(start, start + PAGE_SIZE);
        if (error) throw error;
        items = (rows ?? []).map((r) => base(r.id, r.name, r.description, r.cover_url));
        break;
      }
      case "mentors": {
        let q = supabase
          .from("mentors")
          .select("id,display_name,bio,photo_url")
          .eq("verified", true);
        if (id) q = q.eq("id", id);
        else if (query) q = q.or(searchFilter(["display_name", "bio", "role_title"], query));
        const { data: rows, error } = await q.order("id").range(start, start + PAGE_SIZE);
        if (error) throw error;
        items = (rows ?? []).map((r) => base(r.id, r.display_name, r.bio, r.photo_url));
        break;
      }
      case "courses": {
        let q = supabase.from("courses").select("id,title,description,cover_url");
        if (id) q = q.eq("id", id);
        else if (query) q = q.or(searchFilter(["title", "description", "category"], query));
        const { data: rows, error } = await q.order("id").range(start, start + PAGE_SIZE);
        if (error) throw error;
        items = (rows ?? []).map((r) => base(r.id, r.title, r.description, r.cover_url));
        break;
      }
      case "events": {
        let q = supabase.from("events").select("id,title,description,cover_url");
        if (id) q = q.eq("id", id);
        else {
          q = q.gte("starts_at", new Date().toISOString());
          if (query) q = q.or(searchFilter(["title", "description", "location"], query));
        }
        const { data: rows, error } = await q
          .order("starts_at")
          .order("id")
          .range(start, start + PAGE_SIZE);
        if (error) throw error;
        items = (rows ?? []).map((r) => base(r.id, r.title, r.description, r.cover_url));
        break;
      }
      default: {
        let q = supabase
          .from("media_items")
          .select(
            "id,title,description,thumbnail_url,scripture_ref,source,external_id,audio_url,creator_name,duration_seconds,category",
          )
          .eq("is_approved", true);
        q =
          kind === "music"
            ? q.in("media_type", ["music", "audio"])
            : kind === "podcasts"
              ? q.eq("media_type", "podcast")
              : q.in("media_type", ["video", "sermon"]);
        if (id) q = q.eq("id", id);
        else if (query)
          q = q.or(
            searchFilter(
              ["title", "description", "category", "creator_name", "scripture_ref"],
              query,
            ),
          );
        const { data: rows, error } = await q
          .order("is_featured", { ascending: false })
          .order("id")
          .range(start, start + PAGE_SIZE);
        if (error) throw error;
        items = (rows ?? []).map((r) => ({
          ...base(r.id, r.title, r.description, r.thumbnail_url),
          reference: r.scripture_ref,
          source: r.source,
          externalId: r.external_id,
          audioUrl: r.audio_url,
          creatorName: r.creator_name,
          durationSeconds: r.duration_seconds,
          category: r.category,
        }));
      }
    }
    return { items: items.slice(0, PAGE_SIZE), hasMore: items.length > PAGE_SIZE };
  });
