create index if not exists media_items_approved_type_channel_idx
  on public.media_items (media_type, youtube_channel_id)
  where is_approved = true and youtube_channel_id is not null;

create or replace function public.get_media_directory_with_content(
  p_kind text,
  p_query text default '',
  p_language text default 'all',
  p_offset integer default 0,
  p_limit integer default 36
)
returns table(
  id uuid,
  name text,
  description text,
  avatar_url text,
  youtube_channel_id text,
  content_kind text,
  language_codes text[],
  total_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    s.id,
    s.name,
    s.description,
    s.avatar_url,
    s.youtube_channel_id,
    s.content_kind::text,
    s.language_codes,
    count(*) over() as total_count
  from public.media_sources s
  where s.is_approved = true
    and s.source_type = 'youtube'
    and s.youtube_channel_id is not null
    and s.content_kind::text in (p_kind, 'mixed')
    and (
      nullif(trim(p_query), '') is null
      or s.name ilike '%' || trim(p_query) || '%'
    )
    and (
      p_language = 'all'
      or (
        p_language = 'other'
        and not (s.language_codes && array['en','sw','ki','und']::text[])
      )
      or (
        p_language not in ('all','other')
        and s.language_codes @> array[p_language]::text[]
      )
    )
    and exists (
      select 1
      from public.media_items i
      where i.is_approved = true
        and i.media_type = p_kind
        and i.youtube_channel_id = s.youtube_channel_id
        and (i.source = 'youtube' or nullif(i.audio_url, '') is not null)
    )
  order by s.name, s.id
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 100);
$$;

grant execute on function public.get_media_directory_with_content(text,text,text,integer,integer) to authenticated;
revoke execute on function public.get_media_directory_with_content(text,text,text,integer,integer) from anon;
