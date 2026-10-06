create or replace function private.notify_incoming_call()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_name text;
begin
  if new.status <> 'ringing' then
    return new;
  end if;

  select coalesce(
    nullif(trim(p.full_name), ''),
    nullif(trim(p.username), ''),
    'Someone'
  )
  into caller_name
  from public.profiles p
  where p.id = new.caller_id;

  insert into public.notifications(user_id, category, title, body, deep_link, priority)
  values (
    new.callee_id,
    'call',
    coalesce(caller_name, 'Someone') || ' is calling',
    'Incoming ' || new.kind || ' call. Tap to open Nuru Faith and answer.',
    '/messages?user=' || new.caller_id::text,
    'critical'
  );

  return new;
end
$$;

revoke all on function private.notify_incoming_call()
  from public, anon, authenticated;

drop trigger if exists trg_notify_incoming_call on public.call_sessions;
create trigger trg_notify_incoming_call
after insert on public.call_sessions
for each row execute function private.notify_incoming_call();
