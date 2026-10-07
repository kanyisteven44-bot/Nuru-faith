-- 1. Group-call room hijack.
-- "participants update own heartbeat" only checked user_id, and room_id was
-- updatable, so anyone who could join *some* group call could move their
-- participant row into an active call of a private group they are not in,
-- then exchange WebRTC signals with its members. Updates must now satisfy the
-- same membership rule as joining. The app's upsert (room_id, user_id,
-- updated_at) keeps working.
drop policy if exists "participants update own heartbeat" on public.group_call_participants;
create policy "participants update own heartbeat" on public.group_call_participants
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.group_call_rooms r
      join public.group_members gm on gm.group_id = r.group_id
      where r.id = group_call_participants.room_id
        and gm.user_id = (select auth.uid())
    )
  );

-- Members only ever end a room; they must not rewrite its group, creator or id.
revoke update on public.group_call_rooms from authenticated;
grant update (status, ended_at) on public.group_call_rooms to authenticated;

-- 2. Post spoofing.
-- Posts could be created in (or moved into) any group without membership, and
-- authors could write their own author_name / author_handle / author_avatar_url
-- (impersonation) and like_count / comment_count (fake engagement).
drop policy if exists "posts insert own" on public.posts;
create policy "posts insert own" on public.posts
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (group_id is null or private.is_group_member((select auth.uid()), group_id))
  );

drop policy if exists "posts update own" on public.posts;
create policy "posts update own" on public.posts
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (
    author_id = (select auth.uid())
    and (group_id is null or private.is_group_member((select auth.uid()), group_id))
  );

revoke insert, update on public.posts from authenticated;
grant insert (
  id, author_id, kind, body, scripture_ref, media_url, music_track_id,
  music_start_seconds, group_id, church_id, hashtags
) on public.posts to authenticated;
grant update (
  body, scripture_ref, media_url, music_track_id, music_start_seconds, hashtags
) on public.posts to authenticated;

-- 3. prayer_wall (unused by the app) still exposed user_id for non-anonymous
-- rows; after 20261007120000 authenticated can no longer read that column, so
-- rebuild the view without it.
drop view if exists public.prayer_wall;
create view public.prayer_wall
  with (security_invoker = true, security_barrier = true) as
  select id, title, body, is_anonymous, prayer_count, created_at
  from public.prayer_requests;
revoke all on public.prayer_wall from anon, public;
grant select on public.prayer_wall to authenticated;
