-- posts.like_count / comment_count had the same two problems already fixed for
-- reels (20260912172000) and groups (20260912171500) in this branch's history:
--
-- 1. No sync trigger existed at all — post_likes/post_comments had nothing keeping
--    the parent post's counters honest, unlike reels (sync_reel_like_count,
--    sync_reel_comment_count). Seeded posts carried fabricated engagement (e.g. one
--    post claimed 1,247 likes / 83 comments) against 4 real post_likes rows and 0
--    real post_comments rows anywhere in the table.
-- 2. "posts update own" (author_id = auth.uid()) is row-scoped only, so with no
--    trigger guarding the columns, any post author could also just PATCH their own
--    post's like_count/comment_count directly to whatever they want.

create or replace function public.sync_post_like_count()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  else
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end; $$;

drop trigger if exists trg_post_like_count on public.post_likes;
create trigger trg_post_like_count
  after insert or delete on public.post_likes
  for each row execute function public.sync_post_like_count();

create or replace function public.sync_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  else
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end; $$;

drop trigger if exists trg_post_comment_count on public.post_comments;
create trigger trg_post_comment_count
  after insert or delete on public.post_comments
  for each row execute function public.sync_post_comment_count();

-- Guard against direct self-boosting now that the sync triggers are the only
-- legitimate writer of these two columns (mirrors protect_profile_privileged_columns).
create or replace function public.protect_post_counters()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is not null and not private.is_staff(auth.uid()) then
    new.like_count := old.like_count;
    new.comment_count := old.comment_count;
  end if;
  return new;
end; $$;

drop trigger if exists trg_protect_post_counters on public.posts;
create trigger trg_protect_post_counters
  before update on public.posts
  for each row execute function public.protect_post_counters();

-- One-time correction of the fabricated seed counts.
update public.posts p
set like_count    = (select count(*) from public.post_likes    pl where pl.post_id = p.id),
    comment_count = (select count(*) from public.post_comments pc where pc.post_id = p.id)
where p.like_count    <> (select count(*) from public.post_likes    pl where pl.post_id = p.id)
   or p.comment_count <> (select count(*) from public.post_comments pc where pc.post_id = p.id);
