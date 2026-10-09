-- Members can curate a public (to signed-in Nuru members) profile music shelf.
-- Only approved gospel music already present in Nuru's catalogue is eligible.
create table if not exists public.profile_music (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.media_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create index if not exists profile_music_recent_idx
  on public.profile_music (user_id, created_at desc);

alter table public.profile_music enable row level security;

create policy "members view approved profile music"
on public.profile_music for select to authenticated
using (
  exists (
    select 1 from public.media_items m
    where m.id = item_id and m.media_type = 'music' and m.is_approved = true
  )
);

create policy "members add their approved profile music"
on public.profile_music for insert to authenticated
with check (
  user_id = (select auth.uid()) and
  exists (
    select 1 from public.media_items m
    where m.id = item_id and m.media_type = 'music' and m.is_approved = true
  )
);

create policy "members remove their own profile music"
on public.profile_music for delete to authenticated
using (user_id = (select auth.uid()));

grant select, insert, delete on public.profile_music to authenticated;
