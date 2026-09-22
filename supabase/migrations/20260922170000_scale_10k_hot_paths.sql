-- 10k-user scaling indexes for the hottest Nuru access paths.
-- Keep these focused: broad/unused indexes increase write cost.

create index if not exists notifications_unread_user_created_idx
  on public.notifications(user_id, created_at desc)
  where read = false;

create index if not exists reel_views_user_reel_idx
  on public.reel_views(user_id, reel_id);

create index if not exists reels_church_status_created_idx
  on public.reels(church_id, status, created_at desc)
  where church_id is not null;

create index if not exists reels_author_status_created_idx
  on public.reels(author_id, status, created_at desc)
  where author_id is not null;

create index if not exists user_follows_follower_created_idx
  on public.user_follows(follower_id, created_at desc);

create index if not exists user_follows_following_created_idx
  on public.user_follows(following_id, created_at desc);

create index if not exists post_comments_post_created_idx
  on public.post_comments(post_id, created_at);

create index if not exists profiles_created_idx
  on public.profiles(created_at desc);
