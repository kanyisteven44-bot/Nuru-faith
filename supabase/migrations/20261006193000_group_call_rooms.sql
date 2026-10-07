create table if not exists public.group_call_rooms (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  kind text not null check (kind in ('audio','video')),
  status text not null default 'active' check (status in ('active','ended')),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create unique index if not exists group_call_one_active_per_group
  on public.group_call_rooms(group_id)
  where status = 'active';

create index if not exists group_call_rooms_group_created_idx
  on public.group_call_rooms(group_id, created_at desc);

create table if not exists public.group_call_participants (
  room_id uuid not null references public.group_call_rooms(id) on delete cascade,
  user_id uuid not null,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists group_call_participants_user_idx
  on public.group_call_participants(user_id, updated_at desc);

create table if not exists public.group_call_signals (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.group_call_rooms(id) on delete cascade,
  sender_id uuid not null,
  recipient_id uuid not null,
  signal_type text not null check (signal_type in ('offer','answer')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists group_call_signals_recipient_idx
  on public.group_call_signals(room_id, recipient_id, created_at);

alter table public.group_call_rooms enable row level security;
alter table public.group_call_participants enable row level security;
alter table public.group_call_signals enable row level security;

drop policy if exists "group members read call rooms" on public.group_call_rooms;
create policy "group members read call rooms"
on public.group_call_rooms for select to authenticated
using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = group_call_rooms.group_id
      and gm.user_id = (select auth.uid())
  )
);

drop policy if exists "group members create call rooms" on public.group_call_rooms;
create policy "group members create call rooms"
on public.group_call_rooms for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.group_members gm
    where gm.group_id = group_call_rooms.group_id
      and gm.user_id = (select auth.uid())
  )
);

drop policy if exists "group members end call rooms" on public.group_call_rooms;
create policy "group members end call rooms"
on public.group_call_rooms for update to authenticated
using (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = group_call_rooms.group_id
      and gm.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.group_members gm
    where gm.group_id = group_call_rooms.group_id
      and gm.user_id = (select auth.uid())
  )
);

drop policy if exists "group members read call participants" on public.group_call_participants;
create policy "group members read call participants"
on public.group_call_participants for select to authenticated
using (
  exists (
    select 1
    from public.group_call_rooms r
    join public.group_members gm on gm.group_id = r.group_id
    where r.id = group_call_participants.room_id
      and gm.user_id = (select auth.uid())
  )
);

drop policy if exists "members join group calls" on public.group_call_participants;
create policy "members join group calls"
on public.group_call_participants for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.group_call_rooms r
    join public.group_members gm on gm.group_id = r.group_id
    where r.id = group_call_participants.room_id
      and r.status = 'active'
      and gm.user_id = (select auth.uid())
  )
);

drop policy if exists "participants update own heartbeat" on public.group_call_participants;
create policy "participants update own heartbeat"
on public.group_call_participants for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "participants leave own group call" on public.group_call_participants;
create policy "participants leave own group call"
on public.group_call_participants for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "call participants read signals" on public.group_call_signals;
create policy "call participants read signals"
on public.group_call_signals for select to authenticated
using (
  (recipient_id = (select auth.uid()) or sender_id = (select auth.uid()))
  and exists (
    select 1
    from public.group_call_participants p
    where p.room_id = group_call_signals.room_id
      and p.user_id = (select auth.uid())
  )
);

drop policy if exists "call participants send signals" on public.group_call_signals;
create policy "call participants send signals"
on public.group_call_signals for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.group_call_participants me
    where me.room_id = group_call_signals.room_id
      and me.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.group_call_participants peer
    where peer.room_id = group_call_signals.room_id
      and peer.user_id = group_call_signals.recipient_id
  )
);

drop policy if exists "call participants clear own signals" on public.group_call_signals;
create policy "call participants clear own signals"
on public.group_call_signals for delete to authenticated
using (
  recipient_id = (select auth.uid()) or sender_id = (select auth.uid())
);

revoke all on public.group_call_rooms from anon, authenticated;
grant select, insert on public.group_call_rooms to authenticated;
grant update (status, ended_at) on public.group_call_rooms to authenticated;

revoke all on public.group_call_participants from anon, authenticated;
grant select, insert, update, delete on public.group_call_participants to authenticated;

revoke all on public.group_call_signals from anon, authenticated;
grant select, insert, delete on public.group_call_signals to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='group_call_participants'
  ) then
    alter publication supabase_realtime add table public.group_call_participants;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='group_call_signals'
  ) then
    alter publication supabase_realtime add table public.group_call_signals;
  end if;
end $$;
