
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

revoke all on function public.get_media_directory_with_content(text,text,text,integer,integer) from public, anon;
grant execute on function public.get_media_directory_with_content(text,text,text,integer,integer) to authenticated, service_role;

create table if not exists public.direct_presence (
  user_id uuid not null references auth.users(id) on delete cascade,
  peer_id uuid not null references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, peer_id),
  constraint direct_presence_not_self check (user_id <> peer_id)
);

create index if not exists direct_presence_peer_seen_idx
  on public.direct_presence(peer_id, last_seen_at desc);

alter table public.direct_presence enable row level security;
revoke all on public.direct_presence from anon, authenticated;
grant select, insert, update, delete on public.direct_presence to authenticated;

drop policy if exists "participants read direct presence" on public.direct_presence;
create policy "participants read direct presence"
on public.direct_presence
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or (select auth.uid()) = peer_id
);

drop policy if exists "users write own direct presence" on public.direct_presence;
create policy "users write own direct presence"
on public.direct_presence
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and user_id <> peer_id
);

drop policy if exists "users update own direct presence" on public.direct_presence;
create policy "users update own direct presence"
on public.direct_presence
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "users clear own direct presence" on public.direct_presence;
create policy "users clear own direct presence"
on public.direct_presence
for delete
to authenticated
using ((select auth.uid()) = user_id);

do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
     and not exists(
       select 1 from pg_publication_tables
       where pubname='supabase_realtime'
         and schemaname='public'
         and tablename='direct_presence'
     )
  then
    alter publication supabase_realtime add table public.direct_presence;
  end if;
end $$;
