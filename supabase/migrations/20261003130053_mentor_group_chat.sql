-- Append-only messages. Clients cannot edit authors, participants, or timestamps.
create table public.mentor_chat_messages (
 id uuid primary key default gen_random_uuid(),
 mentor_id uuid not null references public.mentors(id) on delete cascade,
 requester_id uuid not null references public.profiles(id) on delete cascade,
 sender_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check (length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index mentor_chat_thread on public.mentor_chat_messages(mentor_id, requester_id, created_at desc, id desc);
create index mentor_chat_requester on public.mentor_chat_messages(requester_id);
create index mentor_chat_sender on public.mentor_chat_messages(sender_id);
create table public.group_chat_messages (
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.groups(id) on delete cascade,
 sender_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check (length(btrim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index group_chat_thread on public.group_chat_messages(group_id, created_at desc, id desc);
create index group_chat_sender on public.group_chat_messages(sender_id);
alter table public.mentor_chat_messages enable row level security;
alter table public.group_chat_messages enable row level security;
revoke all on public.mentor_chat_messages, public.group_chat_messages from anon, authenticated;
grant select on public.mentor_chat_messages, public.group_chat_messages to authenticated;
grant insert (id,mentor_id,requester_id,sender_id,body) on public.mentor_chat_messages to authenticated;
grant insert (id,group_id,sender_id,body) on public.group_chat_messages to authenticated;
create policy "mentor chat participants read" on public.mentor_chat_messages for select to authenticated
using (exists (select 1 from public.mentors m where m.id=mentor_id and m.user_id is not null
 and (requester_id=(select auth.uid()) or m.user_id=(select auth.uid()))));
create policy "mentor chat participants send" on public.mentor_chat_messages for insert to authenticated
with check (sender_id=(select auth.uid()) and exists (select 1 from public.mentors m
 where m.id=mentor_id and m.user_id is not null and m.user_id<>requester_id
 and (requester_id=(select auth.uid()) or m.user_id=(select auth.uid()))));
create policy "group chat members read" on public.group_chat_messages for select to authenticated
using (exists (select 1 from public.group_members gm where gm.group_id=group_chat_messages.group_id and gm.user_id=(select auth.uid())));
create policy "group chat members send" on public.group_chat_messages for insert to authenticated
with check (sender_id=(select auth.uid()) and exists (select 1 from public.group_members gm where gm.group_id=group_chat_messages.group_id and gm.user_id=(select auth.uid())));
-- RLS is evaluated as the caller; the inbox includes each visible thread,
-- including quiet conversations with older messages.
create view public.mentor_chat_threads with (security_invoker=true) as
 select distinct on (mentor_id, requester_id) * from public.mentor_chat_messages
 order by mentor_id, requester_id, created_at desc, id desc;
revoke all on public.mentor_chat_threads from anon, authenticated;
grant select on public.mentor_chat_threads to authenticated;
