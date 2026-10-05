create table public.media_catalog_imports (
  kind text primary key check (kind in ('music','podcast')),
  channel_id text,
  page_token text,
  status text not null default 'ready' check (status in ('ready','running','paused','complete','exhausted')),
  imported_total integer not null default 0 check (imported_total >= 0),
  pages_processed integer not null default 0 check (pages_processed >= 0),
  last_error text,
  lease_token uuid,
  lease_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.media_catalog_imports enable row level security;
revoke all on public.media_catalog_imports from anon, authenticated;
grant select on public.media_catalog_imports to authenticated;
grant all on public.media_catalog_imports to service_role;
create policy "staff can read import progress" on public.media_catalog_imports
for select to authenticated using (private.is_staff((select auth.uid())));
insert into public.media_catalog_imports (kind) values ('music'),('podcast');
