grant usage on schema private to authenticated;

alter table private.user_activity_daily enable row level security;
alter table private.rate_limits enable row level security;

revoke all on private.user_activity_daily from authenticated;
grant select, insert, update on private.user_activity_daily to authenticated;

revoke all on private.rate_limits from authenticated;
grant select, insert, update on private.rate_limits to authenticated;

drop policy if exists "own activity select" on private.user_activity_daily;
create policy "own activity select"
on private.user_activity_daily for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "own activity insert" on private.user_activity_daily;
create policy "own activity insert"
on private.user_activity_daily for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "own activity update" on private.user_activity_daily;
create policy "own activity update"
on private.user_activity_daily for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "own rate limits select" on private.rate_limits;
create policy "own rate limits select"
on private.rate_limits for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "own rate limits insert" on private.rate_limits;
create policy "own rate limits insert"
on private.rate_limits for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "own rate limits update" on private.rate_limits;
create policy "own rate limits update"
on private.rate_limits for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create or replace function public.record_nuru_activity()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'authentication required'; end if;
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
security invoker
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
  if uid is null then raise exception 'authentication required'; end if;

  case p_action
    when 'ai' then max_requests := 20; window_seconds := 600;
    when 'youtube_search' then max_requests := 30; window_seconds := 600;
    when 'discovery_search' then max_requests := 120; window_seconds := 600;
    else raise exception 'unsupported rate-limit action';
  end case;

  select window_start, request_count into existing_start, existing_count
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
declare result jsonb;
begin
  select jsonb_build_object(
    'profiles', (select count(*) from public.profiles),
    'onboarded', (select count(*) from public.profiles where onboarded = true),
    'active_today', (select count(distinct user_id) from private.user_activity_daily where activity_date = current_date),
    'active_7d', (select count(distinct user_id) from private.user_activity_daily where activity_date >= current_date - 6),
    'active_30d', (select count(distinct user_id) from private.user_activity_daily where activity_date >= current_date - 29),
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
    'push_enabled_users', (select count(distinct user_id) from public.web_push_subscriptions where enabled = true)
  ) into result;
  return result;
end
$$;

revoke all on function public.get_nuru_pilot_metrics() from public, anon, authenticated;
grant execute on function public.get_nuru_pilot_metrics() to service_role;
