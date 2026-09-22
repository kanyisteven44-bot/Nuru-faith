-- Pilot measurement + server-side abuse protection.
-- No message, prayer, search or AI prompt content is recorded here.

create table if not exists private.user_activity_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null default current_date,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

create index if not exists user_activity_daily_date_idx
  on private.user_activity_daily(activity_date desc);

create table if not exists private.rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  window_start timestamptz not null default now(),
  request_count integer not null default 0,
  primary key (user_id, action),
  constraint rate_limits_count_nonnegative check (request_count >= 0)
);

create or replace function public.record_nuru_activity()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'authentication required';
  end if;

  insert into private.user_activity_daily(user_id, activity_date, first_seen_at, last_seen_at)
  values (uid, current_date, now(), now())
  on conflict (user_id, activity_date)
  do update set last_seen_at = excluded.last_seen_at;
end
$$;

revoke all on function public.record_nuru_activity() from public, anon;
grant execute on function public.record_nuru_activity() to authenticated;

create or replace function public.consume_nuru_rate_limit(p_action text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  max_requests integer;
  window_seconds integer;
  existing_start timestamptz;
  existing_count integer;
  next_count integer;
  reset_at timestamptz;
begin
  if uid is null then
    raise exception 'authentication required';
  end if;

  case p_action
    when 'ai' then
      max_requests := 20;
      window_seconds := 600;
    when 'youtube_search' then
      max_requests := 30;
      window_seconds := 600;
    when 'discovery_search' then
      max_requests := 120;
      window_seconds := 600;
    else
      raise exception 'unsupported rate-limit action';
  end case;

  select window_start, request_count
    into existing_start, existing_count
  from private.rate_limits
  where user_id = uid and action = p_action
  for update;

  if not found then
    insert into private.rate_limits(user_id, action, window_start, request_count)
    values (uid, p_action, now(), 1);
    next_count := 1;
    reset_at := now() + make_interval(secs => window_seconds);
  elsif existing_start <= now() - make_interval(secs => window_seconds) then
    update private.rate_limits
    set window_start = now(), request_count = 1
    where user_id = uid and action = p_action;
    next_count := 1;
    reset_at := now() + make_interval(secs => window_seconds);
  else
    next_count := existing_count + 1;
    reset_at := existing_start + make_interval(secs => window_seconds);

    if next_count > max_requests then
      raise exception 'RATE_LIMITED'
        using errcode = 'P0001',
              detail = 'Too many requests for this action. Try again after the current window resets.';
    end if;

    update private.rate_limits
    set request_count = next_count
    where user_id = uid and action = p_action;
  end if;

  return jsonb_build_object(
    'allowed', true,
    'limit', max_requests,
    'remaining', greatest(max_requests - next_count, 0),
    'reset_at', reset_at
  );
end
$$;

revoke all on function public.consume_nuru_rate_limit(text) from public, anon;
grant execute on function public.consume_nuru_rate_limit(text) to authenticated;

create or replace function public.get_nuru_pilot_metrics()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null or not private.is_staff(uid) then
    raise exception 'staff access required';
  end if;

  select jsonb_build_object(
    'profiles', (select count(*) from public.profiles),
    'onboarded', (select count(*) from public.profiles where onboarded = true),
    'active_today', (
      select count(distinct user_id)
      from private.user_activity_daily
      where activity_date = current_date
    ),
    'active_7d', (
      select count(distinct user_id)
      from private.user_activity_daily
      where activity_date >= current_date - 6
    ),
    'active_30d', (
      select count(distinct user_id)
      from private.user_activity_daily
      where activity_date >= current_date - 29
    ),
    'activated_users', (
      select count(distinct user_id)
      from (
        select user_id from public.reel_views
        union
        select follower_id as user_id from public.user_follows
        union
        select author_id as user_id from public.posts
        union
        select requester_id as user_id from public.mentorship_requests
      ) x
      where user_id is not null
    ),
    'reel_viewers', (select count(distinct user_id) from public.reel_views),
    'following_users', (select count(distinct follower_id) from public.user_follows),
    'post_authors', (select count(distinct author_id) from public.posts),
    'mentorship_requesters', (select count(distinct requester_id) from public.mentorship_requests),
    'push_enabled_users', (
      select count(distinct user_id)
      from public.web_push_subscriptions
      where enabled = true
    )
  ) into result;

  return result;
end
$$;

revoke all on function public.get_nuru_pilot_metrics() from public, anon;
grant execute on function public.get_nuru_pilot_metrics() to authenticated;
