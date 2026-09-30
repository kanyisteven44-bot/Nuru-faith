-- Million-scale media catalog support.
--
-- Nuru does NOT store or re-host a million audio files. media_items is a metadata
-- index pointing at approved/licensed external sources. These indexes keep
-- discovery usable as the metadata catalog grows past one million rows.

create extension if not exists pg_trgm;

create index if not exists media_items_approved_type_featured_id_idx
  on public.media_items (media_type, is_featured desc, id)
  where is_approved = true;

create index if not exists media_items_approved_source_external_idx
  on public.media_items (source, external_id)
  where is_approved = true;

create index if not exists media_items_title_trgm_idx
  on public.media_items using gin (title gin_trgm_ops)
  where is_approved = true;

create index if not exists media_items_creator_trgm_idx
  on public.media_items using gin (creator_name gin_trgm_ops)
  where is_approved = true and creator_name is not null;

create index if not exists media_items_category_trgm_idx
  on public.media_items using gin (category gin_trgm_ops)
  where is_approved = true and category is not null;

create index if not exists media_items_description_trgm_idx
  on public.media_items using gin (description gin_trgm_ops)
  where is_approved = true and description is not null;

create index if not exists media_items_scripture_ref_trgm_idx
  on public.media_items using gin (scripture_ref gin_trgm_ops)
  where is_approved = true and scripture_ref is not null;

-- Keep legacy podcast browsing bounded while providers are migrated into media_items.
create index if not exists podcast_episodes_podcast_published_idx
  on public.podcast_episodes (podcast_id, published_at desc, id);
