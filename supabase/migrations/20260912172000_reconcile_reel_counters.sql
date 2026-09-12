-- Reconcile reel engagement counters with the rows that actually back them.
--
-- The seeded reels shipped with fabricated engagement: 14,809 likes and 1,117 comments
-- across the table, against 3 real reel_likes rows and 0 reel_comments. The comment
-- number was directly contradicted in the UI — a reel advertised "244 comments" and the
-- comment sheet opened empty.
--
-- view_count was already accurate and is reconciled here only for completeness.
-- sync_reel_like_count / sync_reel_comment_count / sync_reel_view_count already keep
-- these columns correct going forward, so this is a one-time correction of seed data.

update public.reels r
set like_count    = (select count(*) from public.reel_likes    rl where rl.reel_id = r.id),
    comment_count = (select count(*) from public.reel_comments rc where rc.reel_id = r.id),
    view_count    = (select count(*) from public.reel_views    rv where rv.reel_id = r.id)
where r.like_count    <> (select count(*) from public.reel_likes    rl where rl.reel_id = r.id)
   or r.comment_count <> (select count(*) from public.reel_comments rc where rc.reel_id = r.id)
   or r.view_count    <> (select count(*) from public.reel_views    rv where rv.reel_id = r.id);
