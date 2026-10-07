
create or replace view public.media_sources_with_content
with (security_invoker = true)
as
select
  s.id,
  s.name,
  s.description,
  s.avatar_url,
  s.youtube_channel_id,
  s.content_kind,
  s.language_codes,
  (
    exists (
      select 1 from public.media_items i
      where i.is_approved = true
        and i.media_type = 'music'
        and i.youtube_channel_id = s.youtube_channel_id
    )
    or exists (
      select 1 from public.media_items i
      where i.is_approved = true
        and i.media_type = 'music'
        and lower(btrim(i.creator_name)) = lower(btrim(s.name))
    )
  ) as has_music,
  (
    exists (
      select 1 from public.media_items i
      where i.is_approved = true
        and i.media_type = 'podcast'
        and i.youtube_channel_id = s.youtube_channel_id
    )
    or exists (
      select 1 from public.media_items i
      where i.is_approved = true
        and i.media_type = 'podcast'
        and lower(btrim(i.creator_name)) = lower(btrim(s.name))
    )
  ) as has_podcast
from public.media_sources s
where s.is_approved = true
  and s.source_type = 'youtube'
  and s.youtube_channel_id is not null;
