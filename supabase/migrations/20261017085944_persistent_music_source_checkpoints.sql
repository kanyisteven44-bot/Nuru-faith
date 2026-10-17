-- Service-only per-source checkpoints. No user data or source approval is changed.
create table public.media_catalog_source_progress (
  kind text not null check (kind in ('music','podcast')),
  channel_id text not null,
  source_id uuid not null references public.media_sources(id) on delete cascade,
  page_token text,
  uploads_playlist_id text,
  completed boolean not null default false,
  pages_processed integer not null default 0 check (pages_processed >= 0),
  fetched bigint not null default 0 check (fetched >= 0),
  inserted bigint not null default 0 check (inserted >= 0),
  skipped_existing bigint not null default 0 check (skipped_existing >= 0),
  rejected bigint not null default 0 check (rejected >= 0),
  duration_ms bigint not null default 0 check (duration_ms >= 0),
  updated_at timestamptz not null default now(),
  primary key (kind, channel_id)
);
alter table public.media_catalog_source_progress enable row level security;
revoke all on public.media_catalog_source_progress from public, anon, authenticated;
grant all on public.media_catalog_source_progress to service_role;
create index media_catalog_source_progress_pending_idx
  on public.media_catalog_source_progress(kind, completed, source_id);

-- Retain the one legacy cursor that can be identified reliably. Earlier completed
-- per-source history was never stored and cannot safely be inferred from a subset scan.
insert into public.media_catalog_source_progress(kind,channel_id,source_id,page_token)
select p.kind,p.channel_id,s.id,p.page_token
from public.media_catalog_imports p join public.media_sources s on s.youtube_channel_id=p.channel_id
where p.channel_id is not null and p.status in ('running','paused')
on conflict do nothing;

create function public.next_media_catalog_source(p_kind text, p_channel_ids text[] default '{}')
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('id',s.id,'name',s.name,'channelId',s.youtube_channel_id,
    'languages',s.language_codes,'pageToken',p.page_token,'playlistId',p.uploads_playlist_id)
  from public.media_sources s
  left join public.media_catalog_source_progress p on p.kind=p_kind and p.channel_id=s.youtube_channel_id
  join public.approved_youtube_channels t on t.channel_id=s.youtube_channel_id
  where s.is_approved and s.is_verified and s.source_type='youtube'
    and s.content_kind in (p_kind,'mixed') and s.youtube_channel_id is not null
    and t.is_verified and t.trust_level in ('trusted','official','verified')
    and not coalesce(p.completed,false)
    and (cardinality(p_channel_ids)=0 or s.youtube_channel_id=any(p_channel_ids))
  order by (p.page_token is not null) desc, s.id
  limit 1
$$;

create function public.checkpoint_media_catalog_source(
  p_kind text, p_channel_id text, p_lease uuid, p_expected_token text,
  p_next_token text, p_playlist_id text, p_stats jsonb, p_duration_ms integer
) returns void language plpgsql security invoker set search_path = '' as $$
declare v_source uuid; v_current text; v_fetched bigint; v_inserted bigint; v_existing bigint; v_rejected bigint;
begin
  perform 1 from public.media_catalog_imports where kind=p_kind
    and lease_token=p_lease and lease_until>clock_timestamp() for update;
  if not found then raise exception 'Import lease expired; resume to retry safely'; end if;
  v_fetched := (p_stats->>'fetched')::bigint;
  v_inserted := (p_stats->>'inserted')::bigint;
  v_existing := (p_stats->>'skippedExisting')::bigint;
  v_rejected := (p_stats->>'rejected')::bigint;
  if v_fetched is null or v_inserted is null or v_existing is null or v_rejected is null
    or least(v_fetched,v_inserted,v_existing,v_rejected)<0 or v_fetched>50
    or v_fetched<>v_inserted+v_existing+v_rejected then
    raise exception 'Invalid page statistics';
  end if;
  select id into strict v_source from public.media_sources where youtube_channel_id=p_channel_id;
  insert into public.media_catalog_source_progress(kind,channel_id,source_id)
    values(p_kind,p_channel_id,v_source) on conflict do nothing;
  select page_token into v_current from public.media_catalog_source_progress
    where kind=p_kind and channel_id=p_channel_id and not completed for update;
  if not found or v_current is distinct from p_expected_token then
    raise exception 'Checkpoint changed; resume from the saved page';
  end if;
  if p_next_token is not null and p_next_token is not distinct from p_expected_token then
    raise exception 'YouTube repeated a page token; progress was not advanced';
  end if;
  update public.media_catalog_source_progress set
    page_token=p_next_token, uploads_playlist_id=p_playlist_id, completed=p_next_token is null,
    pages_processed=pages_processed+1,
    fetched=fetched+(p_stats->>'fetched')::bigint,
    inserted=inserted+(p_stats->>'inserted')::bigint,
    skipped_existing=skipped_existing+(p_stats->>'skippedExisting')::bigint,
    rejected=rejected+(p_stats->>'rejected')::bigint,
    duration_ms=duration_ms+greatest(0,p_duration_ms), updated_at=clock_timestamp()
    where kind=p_kind and channel_id=p_channel_id;
  update public.media_catalog_imports set channel_id=p_channel_id,page_token=p_next_token,
    imported_total=imported_total+(p_stats->>'inserted')::integer,
    pages_processed=pages_processed+1,status='running',last_error=null,updated_at=clock_timestamp()
    where kind=p_kind;
end $$;

create function public.reset_media_catalog_sources(p_kind text,p_channel_ids text[],p_lease uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.media_catalog_imports where kind=p_kind
    and lease_token=p_lease and lease_until>clock_timestamp() for update;
  if not found then raise exception 'Import lease expired'; end if;
  if cardinality(p_channel_ids)=0 then raise exception 'Select specific creators before rescanning'; end if;
  -- Retain cumulative counters; only an explicit reset makes completed history eligible again.
  update public.media_catalog_source_progress set page_token=null,completed=false,updated_at=clock_timestamp()
    where kind=p_kind and channel_id=any(p_channel_ids);
end $$;

create function public.media_catalog_scan_summary(p_kind text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with sources as (
    select s.id,s.name,s.youtube_channel_id from public.media_sources s
    join public.approved_youtube_channels t on t.channel_id=s.youtube_channel_id
    where s.is_approved and s.is_verified and s.source_type='youtube'
      and s.content_kind in (p_kind,'mixed') and t.is_verified and t.trust_level in ('trusted','official','verified')
  ), progress as (
    select s.name,p.* from sources s join public.media_catalog_source_progress p
      on p.channel_id=s.youtube_channel_id and p.kind=p_kind
  )
  select jsonb_build_object(
    'sourceTotal',(select count(*) from sources),
    'completedSources',(select count(*) from progress where completed),
    'pages',coalesce((select sum(pages_processed) from progress),0),
    'fetched',coalesce((select sum(fetched) from progress),0),
    'inserted',coalesce((select sum(inserted) from progress),0),
    'skippedExisting',coalesce((select sum(skipped_existing) from progress),0),
    'rejected',coalesce((select sum(rejected) from progress),0),
    'durationMs',coalesce((select sum(duration_ms) from progress),0),
    'recent',coalesce((select jsonb_agg(row_to_json(r)) from (
      select name,channel_id,completed,pages_processed,inserted,skipped_existing,rejected,updated_at
      from progress order by updated_at desc limit 12
    ) r),'[]'::jsonb)
  )
$$;

revoke all on function public.next_media_catalog_source(text,text[]) from public,anon,authenticated;
revoke all on function public.checkpoint_media_catalog_source(text,text,uuid,text,text,text,jsonb,integer) from public,anon,authenticated;
revoke all on function public.reset_media_catalog_sources(text,text[],uuid) from public,anon,authenticated;
revoke all on function public.media_catalog_scan_summary(text) from public,anon,authenticated;
grant execute on function public.next_media_catalog_source(text,text[]) to service_role;
grant execute on function public.checkpoint_media_catalog_source(text,text,uuid,text,text,text,jsonb,integer) to service_role;
grant execute on function public.reset_media_catalog_sources(text,text[],uuid) to service_role;
grant execute on function public.media_catalog_scan_summary(text) to service_role;
