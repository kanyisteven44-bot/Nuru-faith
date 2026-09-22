create extension if not exists supabase_vault with schema vault;
create extension if not exists pg_net with schema extensions;

create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time bigint,
  enabled boolean not null default true,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists web_push_subscriptions_user_enabled_idx
  on public.web_push_subscriptions(user_id)
  where enabled = true;

alter table public.web_push_subscriptions enable row level security;

revoke all on table public.web_push_subscriptions from anon, authenticated;
grant select on table public.web_push_subscriptions to authenticated;
grant all on table public.web_push_subscriptions to service_role;

drop policy if exists "web push own select" on public.web_push_subscriptions;
create policy "web push own select"
on public.web_push_subscriptions for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.register_web_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_expiration_time bigint default null,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
  subscription_id uuid;
begin
  uid := (select auth.uid());
  if uid is null then
    raise exception 'authentication required';
  end if;

  if p_endpoint is null or p_endpoint !~ '^https://' then
    raise exception 'invalid push endpoint';
  end if;

  if p_p256dh is null or length(p_p256dh) < 20
     or p_auth is null or length(p_auth) < 8 then
    raise exception 'invalid push subscription keys';
  end if;

  delete from public.web_push_subscriptions
  where endpoint = p_endpoint;

  insert into public.web_push_subscriptions(
    user_id, endpoint, p256dh, auth, expiration_time,
    enabled, user_agent, updated_at, last_seen_at
  )
  values (
    uid, p_endpoint, p_p256dh, p_auth, p_expiration_time,
    true, left(p_user_agent, 500), now(), now()
  )
  returning id into subscription_id;

  insert into public.notification_preferences(user_id)
  values (uid)
  on conflict (user_id) do nothing;

  return subscription_id;
end
$$;

revoke all on function public.register_web_push_subscription(text,text,text,bigint,text)
  from public, anon;
grant execute on function public.register_web_push_subscription(text,text,text,bigint,text)
  to authenticated;

create or replace function public.unregister_web_push_subscription(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
begin
  uid := (select auth.uid());
  if uid is null then
    raise exception 'authentication required';
  end if;

  delete from public.web_push_subscriptions
  where endpoint = p_endpoint
    and user_id = uid;
end
$$;

revoke all on function public.unregister_web_push_subscription(text)
  from public, anon;
grant execute on function public.unregister_web_push_subscription(text)
  to authenticated;

create or replace function public.get_web_push_public_key()
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'nuru_web_push_vapid_public'
  limit 1
$$;

revoke all on function public.get_web_push_public_key() from public, anon;
grant execute on function public.get_web_push_public_key() to authenticated;

create or replace function public.get_web_push_server_config()
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'subject', (select decrypted_secret from vault.decrypted_secrets where name = 'nuru_web_push_vapid_subject' limit 1),
    'publicKey', (select decrypted_secret from vault.decrypted_secrets where name = 'nuru_web_push_vapid_public' limit 1),
    'privateKey', (select decrypted_secret from vault.decrypted_secrets where name = 'nuru_web_push_vapid_private' limit 1),
    'dispatchSecret', (select decrypted_secret from vault.decrypted_secrets where name = 'nuru_web_push_dispatch_secret' limit 1)
  )
$$;

revoke all on function public.get_web_push_server_config()
  from public, anon, authenticated;
grant execute on function public.get_web_push_server_config()
  to service_role;

create or replace function private.dispatch_web_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  webhook_secret text;
  should_push boolean := true;
begin
  if not exists (
    select 1
    from public.web_push_subscriptions s
    where s.user_id = new.user_id
      and s.enabled = true
  ) then
    return new;
  end if;

  select case
    when p.push_enabled = false then false
    when new.category = 'social' and p.social_enabled = false then false
    when new.category = 'mentorship' and p.mentorship_enabled = false then false
    when new.category = 'event' and p.events_enabled = false then false
    else true
  end
  into should_push
  from public.notification_preferences p
  where p.user_id = new.user_id;

  if should_push is false then
    return new;
  end if;

  select decrypted_secret
  into webhook_secret
  from vault.decrypted_secrets
  where name = 'nuru_web_push_dispatch_secret'
  limit 1;

  if webhook_secret is null or webhook_secret = '' then
    return new;
  end if;

  perform net.http_post(
    url := 'https://qnqkcqywvqzfkickezxd.supabase.co/functions/v1/send-web-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-nuru-push-secret', webhook_secret
    ),
    body := jsonb_build_object('notification_id', new.id),
    timeout_milliseconds := 5000
  );

  return new;
end
$$;

revoke all on function private.dispatch_web_push()
  from public, anon, authenticated;

drop trigger if exists trg_dispatch_web_push on public.notifications;
create trigger trg_dispatch_web_push
after insert on public.notifications
for each row execute function private.dispatch_web_push();
