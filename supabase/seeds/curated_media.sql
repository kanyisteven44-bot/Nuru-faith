-- Curated content starter library for Nuru Faith.
-- We store only metadata and official YouTube channel/playlist identifiers.
-- Audio/video remains hosted and played by YouTube.

insert into public.media_sources (
  name, source_type, youtube_channel_id, description, is_verified, is_approved
)
select
  c.channel_name,
  'youtube',
  c.channel_id,
  case
    when c.country = 'KE' then 'Official Kenyan Christian YouTube channel curated for Nuru Faith.'
    when c.country = 'ZA' then 'Official African Christian YouTube channel curated for Nuru Faith.'
    else 'Official Christian YouTube channel curated for Nuru Faith.'
  end,
  c.trust_level in ('official','verified','trusted'),
  true
from public.approved_youtube_channels c
where c.trust_level in ('official','verified','trusted')
  and not exists (
    select 1 from public.media_sources s
    where s.youtube_channel_id = c.channel_id
  );

-- Every YouTube channel has an uploads playlist whose id is UC... -> UU...
-- This gives Music a playable permanent library without consuming search quota.
insert into public.media_playlists (
  title, slug, description, kind, youtube_playlist_id, category, is_featured, is_approved
)
select
  c.channel_name || ' — Official Worship',
  'official-' || trim(both '-' from regexp_replace(lower(c.channel_name), '[^a-z0-9]+', '-', 'g')),
  case
    when c.country = 'KE' then 'Kenyan worship and gospel from the official ' || c.channel_name || ' YouTube channel.'
    when c.country = 'ZA' then 'African praise and worship from the official ' || c.channel_name || ' YouTube channel.'
    else 'Worship from the official ' || c.channel_name || ' YouTube channel.'
  end,
  'youtube',
  'UU' || substring(c.channel_id from 3),
  'worship',
  c.is_featured,
  true
from public.approved_youtube_channels c
where c.channel_id like 'UC%'
  and c.category = 'worship'
  and c.trust_level in ('official','verified','trusted')
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  youtube_playlist_id = excluded.youtube_playlist_id,
  category = excluded.category,
  is_featured = excluded.is_featured,
  is_approved = true,
  updated_at = now();

-- Test-only reels should never be visible in the public faith feed.
update public.reels
set status = 'draft',
    is_public = false,
    updated_at = now()
where creator_name = 'Nuru Test Content'
  and caption like '[Test reel %';
