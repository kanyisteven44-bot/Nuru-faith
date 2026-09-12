-- Security fix: post/reel comments and likes were readable (and, for
-- comments, writable) by any authenticated user regardless of whether they
-- could see the parent post/reel. A user with no access to a private group's
-- posts, or to a non-public reel, could still read (and comment on) that
-- content directly through post_comments/post_likes/reel_comments/
-- reel_likes/reel_comment_likes, because those policies used an
-- unconditional `true` check instead of mirroring the parent table's own
-- visibility rule. This scopes each policy to the same visibility already
-- enforced on `posts` and `reels`, without touching any other behavior.

-- post_comments: readable/insertable only where the parent post is visible
drop policy if exists "comments readable" on public.post_comments;
create policy "comments readable" on public.post_comments
for select to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_comments.post_id
      and (
        p.group_id is null
        or exists (select 1 from public.groups g where g.id = p.group_id and g.privacy = 'public'::group_privacy)
        or private.is_group_member(auth.uid(), p.group_id)
      )
  )
);

drop policy if exists "comments own" on public.post_comments;
create policy "comments own" on public.post_comments
for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.posts p
    where p.id = post_comments.post_id
      and (
        p.group_id is null
        or exists (select 1 from public.groups g where g.id = p.group_id and g.privacy = 'public'::group_privacy)
        or private.is_group_member(auth.uid(), p.group_id)
      )
  )
);

-- post_likes: same parent-visibility scoping
drop policy if exists "likes readable" on public.post_likes;
create policy "likes readable" on public.post_likes
for select to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_likes.post_id
      and (
        p.group_id is null
        or exists (select 1 from public.groups g where g.id = p.group_id and g.privacy = 'public'::group_privacy)
        or private.is_group_member(auth.uid(), p.group_id)
      )
  )
);

drop policy if exists "likes own" on public.post_likes;
create policy "likes own" on public.post_likes
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.posts p
    where p.id = post_likes.post_id
      and (
        p.group_id is null
        or exists (select 1 from public.groups g where g.id = p.group_id and g.privacy = 'public'::group_privacy)
        or private.is_group_member(auth.uid(), p.group_id)
      )
  )
);

-- reel_comments: readable/insertable only where the parent reel is visible
drop policy if exists "Anyone signed in can read reel comments" on public.reel_comments;
create policy "Anyone signed in can read reel comments" on public.reel_comments
for select to authenticated
using (
  exists (
    select 1 from public.reels r
    where r.id = reel_comments.reel_id
      and (
        (r.status = 'published'::text and r.is_public)
        or r.author_id = auth.uid()
        or r.uploaded_by = auth.uid()
        or private.is_staff(auth.uid())
        or (r.church_id is not null and private.is_church_admin(auth.uid(), r.church_id))
      )
  )
);

drop policy if exists "Users write own reel comments" on public.reel_comments;
create policy "Users write own reel comments" on public.reel_comments
for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.reels r
    where r.id = reel_comments.reel_id
      and (
        (r.status = 'published'::text and r.is_public)
        or r.author_id = auth.uid()
        or r.uploaded_by = auth.uid()
        or private.is_staff(auth.uid())
        or (r.church_id is not null and private.is_church_admin(auth.uid(), r.church_id))
      )
  )
);

-- reel_likes: same parent-visibility scoping
drop policy if exists "reel likes readable" on public.reel_likes;
create policy "reel likes readable" on public.reel_likes
for select to authenticated
using (
  exists (
    select 1 from public.reels r
    where r.id = reel_likes.reel_id
      and (
        (r.status = 'published'::text and r.is_public)
        or r.author_id = auth.uid()
        or r.uploaded_by = auth.uid()
        or private.is_staff(auth.uid())
        or (r.church_id is not null and private.is_church_admin(auth.uid(), r.church_id))
      )
  )
);

drop policy if exists "reel likes own" on public.reel_likes;
create policy "reel likes own" on public.reel_likes
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.reels r
    where r.id = reel_likes.reel_id
      and (
        (r.status = 'published'::text and r.is_public)
        or r.author_id = auth.uid()
        or r.uploaded_by = auth.uid()
        or private.is_staff(auth.uid())
        or (r.church_id is not null and private.is_church_admin(auth.uid(), r.church_id))
      )
  )
);

-- reel_comment_likes: scoped through the comment's reel visibility
drop policy if exists "Read comment likes" on public.reel_comment_likes;
create policy "Read comment likes" on public.reel_comment_likes
for select to authenticated
using (
  exists (
    select 1 from public.reel_comments rc
    join public.reels r on r.id = rc.reel_id
    where rc.id = reel_comment_likes.comment_id
      and (
        (r.status = 'published'::text and r.is_public)
        or r.author_id = auth.uid()
        or r.uploaded_by = auth.uid()
        or private.is_staff(auth.uid())
        or (r.church_id is not null and private.is_church_admin(auth.uid(), r.church_id))
      )
  )
);

drop policy if exists "Manage own comment likes" on public.reel_comment_likes;
create policy "Manage own comment likes" on public.reel_comment_likes
for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.reel_comments rc
    join public.reels r on r.id = rc.reel_id
    where rc.id = reel_comment_likes.comment_id
      and (
        (r.status = 'published'::text and r.is_public)
        or r.author_id = auth.uid()
        or r.uploaded_by = auth.uid()
        or private.is_staff(auth.uid())
        or (r.church_id is not null and private.is_church_admin(auth.uid(), r.church_id))
      )
  )
);
