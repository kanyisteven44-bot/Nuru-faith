-- Entirely synthetic schema/data. No production connection or user records.
create role anon;
create role authenticated;
create schema auth;
grant usage on schema public, auth to anon, authenticated;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;
create table public.user_roles(user_id uuid not null, role text not null);
create table public.media_items(id uuid primary key, is_approved boolean);
create table public.media_sources(id uuid primary key, is_approved boolean);
create table public.nuru_admin_audit_log(
  actor_id uuid, target_table text, target_id uuid, action text,
  previous_approval boolean, new_approval boolean
);
alter table public.media_items enable row level security;
alter table public.media_sources enable row level security;
alter table public.nuru_admin_audit_log enable row level security;
-- No direct table access is granted; only the guarded definer can write.
insert into public.user_roles values('11111111-1111-4111-8111-111111111111','super_admin');
insert into public.media_items values('44444444-4444-4444-8444-444444444444',false);
insert into public.media_sources values('55555555-5555-4555-8555-555555555555',true);
