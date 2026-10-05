create unique index if not exists profiles_username_lower_unique
on public.profiles (lower(username))
where username is not null;

alter table public.profiles
  drop constraint if exists profiles_username_format_check;

alter table public.profiles
  add constraint profiles_username_format_check
  check (
    username is null
    or username ~ '^[a-z0-9._]{3,30}$'
  );

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint direct_messages_not_self check (sender_id <> recipient_id),
  constraint direct_messages_body_check check (
    char_length(btrim(body)) between 1 and 2000
  )
);

create index if not exists direct_messages_sender_recipient_created
on public.direct_messages (sender_id, recipient_id, created_at desc, id desc);

create index if not exists direct_messages_recipient_sender_created
on public.direct_messages (recipient_id, sender_id, created_at desc, id desc);

alter table public.direct_messages enable row level security;

drop policy if exists "direct messages participants read" on public.direct_messages;
create policy "direct messages participants read"
on public.direct_messages
for select
to authenticated
using (
  (select auth.uid()) = sender_id
  or (select auth.uid()) = recipient_id
);

drop policy if exists "direct messages sender insert" on public.direct_messages;
create policy "direct messages sender insert"
on public.direct_messages
for insert
to authenticated
with check (
  (select auth.uid()) = sender_id
  and sender_id <> recipient_id
);

revoke all on public.direct_messages from anon;
grant select, insert on public.direct_messages to authenticated;
