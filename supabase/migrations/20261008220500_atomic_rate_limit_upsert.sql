-- Concurrent searches previously raced at SELECT FOR UPDATE -> INSERT.
-- If two same-user requests arrived before either counter row existed, one
-- raised rate_limits_pkey 23505 and the search failed. Make creation/increment
-- a single atomic upsert, without weakening quotas or authorization.
create or replace function public.consume_nuru_rate_limit(p_action text)
returns jsonb
language plpgsql
set search_path = ''
as $function$
declare
  uid uuid := auth.uid();
  max_requests integer;
  window_seconds integer;
  now_at timestamptz := clock_timestamp();
  existing_start timestamptz;
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

  insert into private.rate_limits (user_id, action, window_start, request_count)
  values (uid, p_action, now_at, 1)
  on conflict (user_id, action) do update
  set window_start = case
        when private.rate_limits.window_start <= now_at - make_interval(secs => window_seconds)
          then now_at
        else private.rate_limits.window_start
      end,
      request_count = case
        when private.rate_limits.window_start <= now_at - make_interval(secs => window_seconds)
          then 1
        else private.rate_limits.request_count + 1
      end
  returning window_start, request_count into existing_start, next_count;

  reset_at := existing_start + make_interval(secs => window_seconds);
  if next_count > max_requests then
    -- PostgreSQL rolls back this statement's counter update on the
    -- exception, retaining the max value and failing closed.
    raise exception 'RATE_LIMITED'
      using errcode = 'P0001',
            detail = 'Too many requests for this action. Try again after the current window resets.';
  end if;

  return jsonb_build_object(
    'allowed', true,
    'limit', max_requests,
    'remaining', greatest(max_requests - next_count, 0),
    'reset_at', reset_at
  );
end
$function$;
