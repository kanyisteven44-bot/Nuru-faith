alter table public.notifications
  add column if not exists deep_link text,
  add column if not exists priority text not null default 'normal',
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'notifications_priority_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_priority_check
      check (priority in ('normal','important','critical'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'notifications_deep_link_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_deep_link_check
      check (deep_link is null or left(deep_link, 1) = '/');
  end if;
end
$$;

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null default 'web',
  enabled boolean not null default true,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint device_push_tokens_platform_check
    check (platform in ('web','android','ios'))
);

create index if not exists device_push_tokens_user_idx
  on public.device_push_tokens(user_id)
  where enabled = true;

alter table public.device_push_tokens enable row level security;

drop policy if exists "push tokens own select" on public.device_push_tokens;
create policy "push tokens own select"
on public.device_push_tokens for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "push tokens own insert" on public.device_push_tokens;
create policy "push tokens own insert"
on public.device_push_tokens for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "push tokens own update" on public.device_push_tokens;
create policy "push tokens own update"
on public.device_push_tokens for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "push tokens own delete" on public.device_push_tokens;
create policy "push tokens own delete"
on public.device_push_tokens for delete
to authenticated
using ((select auth.uid()) = user_id);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default true,
  social_enabled boolean not null default true,
  mentorship_enabled boolean not null default true,
  events_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "notification preferences own" on public.notification_preferences;
create policy "notification preferences own"
on public.notification_preferences for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function private.notify_new_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  follower_name text;
begin
  if new.follower_id = new.following_id then
    return new;
  end if;

  select coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.username), ''), 'Someone')
    into follower_name
  from public.profiles p
  where p.id = new.follower_id;

  insert into public.notifications(user_id, category, title, body, deep_link, priority)
  values (
    new.following_id,
    'social',
    'New follower',
    coalesce(follower_name, 'Someone') || ' started following you.',
    '/discovery/profile/' || new.follower_id::text,
    'normal'
  );

  return new;
end
$$;

revoke all on function private.notify_new_follow() from public, anon, authenticated;

drop trigger if exists trg_notify_new_follow on public.user_follows;
create trigger trg_notify_new_follow
after insert on public.user_follows
for each row execute function private.notify_new_follow();

create or replace function private.notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
  commenter_name text;
begin
  select p.author_id into owner_id
  from public.posts p
  where p.id = new.post_id;

  if owner_id is null or owner_id = new.author_id then
    return new;
  end if;

  select coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.username), ''), 'Someone')
    into commenter_name
  from public.profiles p
  where p.id = new.author_id;

  insert into public.notifications(user_id, category, title, body, deep_link, priority)
  values (
    owner_id,
    'social',
    'New comment',
    coalesce(commenter_name, 'Someone') || ' commented on your post.',
    '/community',
    'normal'
  );

  return new;
end
$$;

revoke all on function private.notify_post_comment() from public, anon, authenticated;

drop trigger if exists trg_notify_post_comment on public.post_comments;
create trigger trg_notify_post_comment
after insert on public.post_comments
for each row execute function private.notify_post_comment();

create or replace function private.notify_reel_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
  commenter_name text;
begin
  select r.author_id into owner_id
  from public.reels r
  where r.id = new.reel_id;

  if owner_id is null or owner_id = new.user_id then
    return new;
  end if;

  select coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.username), ''), 'Someone')
    into commenter_name
  from public.profiles p
  where p.id = new.user_id;

  insert into public.notifications(user_id, category, title, body, deep_link, priority)
  values (
    owner_id,
    'social',
    'New Reel comment',
    coalesce(commenter_name, 'Someone') || ' commented on your Reel.',
    '/reels',
    'normal'
  );

  return new;
end
$$;

revoke all on function private.notify_reel_comment() from public, anon, authenticated;

drop trigger if exists trg_notify_reel_comment on public.reel_comments;
create trigger trg_notify_reel_comment
after insert on public.reel_comments
for each row execute function private.notify_reel_comment();

create or replace function private.notify_mentorship_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mentor_user_id uuid;
  requester_name text;
begin
  select m.user_id into mentor_user_id
  from public.mentors m
  where m.id = new.mentor_id;

  if mentor_user_id is null or mentor_user_id = new.requester_id then
    return new;
  end if;

  select coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.username), ''), 'A Nuru member')
    into requester_name
  from public.profiles p
  where p.id = new.requester_id;

  insert into public.notifications(user_id, category, title, body, deep_link, priority)
  values (
    mentor_user_id,
    'mentorship',
    'New mentorship request',
    coalesce(requester_name, 'A Nuru member') || ' requested mentorship.',
    '/mentorship',
    'important'
  );

  return new;
end
$$;

revoke all on function private.notify_mentorship_request() from public, anon, authenticated;

drop trigger if exists trg_notify_mentorship_request on public.mentorship_requests;
create trigger trg_notify_mentorship_request
after insert on public.mentorship_requests
for each row execute function private.notify_mentorship_request();

create or replace function private.notify_mentorship_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  insert into public.notifications(user_id, category, title, body, deep_link, priority)
  values (
    new.requester_id,
    'mentorship',
    'Mentorship request updated',
    'Your mentorship request is now ' || new.status::text || '.',
    '/mentorship',
    case when new.status::text = 'accepted' then 'important' else 'normal' end
  );

  return new;
end
$$;

revoke all on function private.notify_mentorship_status() from public, anon, authenticated;

drop trigger if exists trg_notify_mentorship_status on public.mentorship_requests;
create trigger trg_notify_mentorship_status
after update of status on public.mentorship_requests
for each row execute function private.notify_mentorship_status();

create or replace function private.protect_mentorship_parties()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.requester_id is distinct from old.requester_id
     or new.mentor_id is distinct from old.mentor_id then
    raise exception 'mentorship request parties are immutable';
  end if;
  return new;
end
$$;

revoke all on function private.protect_mentorship_parties() from public, anon, authenticated;

drop trigger if exists trg_protect_mentorship_parties on public.mentorship_requests;
create trigger trg_protect_mentorship_parties
before update on public.mentorship_requests
for each row execute function private.protect_mentorship_parties();

drop policy if exists "mentorship update parties" on public.mentorship_requests;
drop policy if exists "requesters edit pending mentorship request" on public.mentorship_requests;
drop policy if exists "mentors update assigned mentorship request" on public.mentorship_requests;
drop policy if exists "staff update mentorship requests" on public.mentorship_requests;

create policy "requesters edit pending mentorship request"
on public.mentorship_requests for update
to authenticated
using (
  requester_id = (select auth.uid())
  and status::text = 'pending'
)
with check (
  requester_id = (select auth.uid())
  and status::text = 'pending'
);

create policy "mentors update assigned mentorship request"
on public.mentorship_requests for update
to authenticated
using (
  exists (
    select 1 from public.mentors m
    where m.id = mentor_id
      and m.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.mentors m
    where m.id = mentor_id
      and m.user_id = (select auth.uid())
  )
);

create policy "staff update mentorship requests"
on public.mentorship_requests for update
to authenticated
using (private.is_staff((select auth.uid())))
with check (private.is_staff((select auth.uid())));
