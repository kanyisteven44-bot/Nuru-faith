-- Wrap auth.uid()/auth.role() calls in RLS policies with (select ...) so
-- Postgres evaluates them once per query instead of once per row
-- (Supabase performance advisor: "Auth RLS Initialization Plan").
-- Rewrite generated programmatically from the live pg_policies definitions
-- and validated against a local Postgres replay + the existing RLS
-- regression suites before being applied to production.
BEGIN;

DROP POLICY IF EXISTS "ai convos own" ON public.ai_conversations;
CREATE POLICY "ai convos own" ON public.ai_conversations FOR ALL TO authenticated
USING ((user_id = (select auth.uid())))
WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "ai messages own" ON public.ai_messages;
CREATE POLICY "ai messages own" ON public.ai_messages FOR ALL TO authenticated
USING ((user_id = (select auth.uid())))
WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "messages conversation boundary" ON public.ai_messages;
CREATE POLICY "messages conversation boundary" ON public.ai_messages AS RESTRICTIVE FOR ALL TO authenticated
USING ((EXISTS ( SELECT 1
   FROM ai_conversations c
  WHERE ((c.id = ai_messages.conversation_id) AND (c.user_id = (select auth.uid()))))))
WITH CHECK ((EXISTS ( SELECT 1
   FROM ai_conversations c
  WHERE ((c.id = ai_messages.conversation_id) AND (c.user_id = (select auth.uid()))))));

DROP POLICY IF EXISTS "Private saved AI responses" ON public.ai_saved_responses;
CREATE POLICY "Private saved AI responses" ON public.ai_saved_responses FOR ALL TO authenticated
USING (((select auth.uid()) = user_id))
WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "staff add channels" ON public.approved_youtube_channels;
CREATE POLICY "staff add channels" ON public.approved_youtube_channels FOR INSERT TO authenticated
WITH CHECK (private.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "staff delete channels" ON public.approved_youtube_channels;
CREATE POLICY "staff delete channels" ON public.approved_youtube_channels FOR DELETE TO authenticated
USING (private.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "staff edit channels" ON public.approved_youtube_channels;
CREATE POLICY "staff edit channels" ON public.approved_youtube_channels FOR UPDATE TO authenticated
USING (private.is_staff((select auth.uid())))
WITH CHECK (private.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "church members join" ON public.church_members;
CREATE POLICY "church members join" ON public.church_members FOR INSERT TO authenticated
WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "church members leave" ON public.church_members;
CREATE POLICY "church members leave" ON public.church_members FOR DELETE TO authenticated
USING (((user_id = (select auth.uid())) OR private.is_church_admin((select auth.uid()), church_id)));

DROP POLICY IF EXISTS "church members readable" ON public.church_members;
CREATE POLICY "church members readable" ON public.church_members FOR SELECT TO authenticated
USING (((user_id = (select auth.uid())) OR private.is_church_admin((select auth.uid()), church_id) OR private.is_staff((select auth.uid()))));

DROP POLICY IF EXISTS "church members update own" ON public.church_members;
CREATE POLICY "church members update own" ON public.church_members FOR UPDATE TO authenticated
USING ((user_id = (select auth.uid())))
WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "churches admin update" ON public.churches;
CREATE POLICY "churches admin update" ON public.churches FOR UPDATE TO authenticated
USING (private.is_church_admin((select auth.uid()), id))
WITH CHECK (private.is_church_admin((select auth.uid()), id));

DROP POLICY IF EXISTS "churches super insert" ON public.churches;
CREATE POLICY "churches super insert" ON public.churches FOR INSERT TO authenticated
WITH CHECK (private.has_role((select auth.uid()), 'super_admin'::app_role));

DROP POLICY IF EXISTS "progress own" ON public.course_progress;
CREATE POLICY "progress own" ON public.course_progress FOR ALL TO authenticated
USING ((user_id = (select auth.uid())))
WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "attend own" ON public.event_attendees;
CREATE POLICY "attend own" ON public.event_attendees FOR INSERT TO authenticated
WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "attendees readable" ON public.event_attendees;
CREATE POLICY "attendees readable" ON public.event_attendees FOR SELECT TO authenticated
USING (((user_id = (select auth.uid())) OR private.is_staff((select auth.uid())) OR (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_attendees.event_id) AND ((e.created_by = (select auth.uid())) OR private.is_church_admin((select auth.uid()), e.church_id)))))));

DROP POLICY IF EXISTS "unattend own" ON public.event_attendees;
CREATE POLICY "unattend own" ON public.event_attendees FOR DELETE TO authenticated
USING ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "events admin delete" ON public.events;
CREATE POLICY "events admin delete" ON public.events FOR DELETE TO authenticated
USING (((created_by = (select auth.uid())) OR private.is_church_admin((select auth.uid()), church_id)));

DROP POLICY IF EXISTS "events admin update" ON public.events;
CREATE POLICY "events admin update" ON public.events FOR UPDATE TO authenticated
USING (((created_by = (select auth.uid())) OR private.is_church_admin((select auth.uid()), church_id)))
WITH CHECK ((((created_by = (select auth.uid())) AND ((church_id IS NULL) OR private.is_church_admin((select auth.uid()), church_id))) OR private.is_church_admin((select auth.uid()), church_id)));

DROP POLICY IF EXISTS "events admin write" ON public.events;
CREATE POLICY "events admin write" ON public.events FOR INSERT TO authenticated
WITH CHECK (((created_by = (select auth.uid())) AND ((church_id IS NULL) OR private.is_church_admin((select auth.uid()), church_id))));

DROP POLICY IF EXISTS "group members join" ON public.group_members;
CREATE POLICY "group members join" ON public.group_members FOR INSERT TO authenticated
WITH CHECK (((user_id = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM groups g
  WHERE ((g.id = group_members.group_id) AND ((g.privacy = 'public'::group_privacy) OR ((g.privacy = 'church_only'::group_privacy) AND (EXISTS ( SELECT 1
           FROM church_members cm
          WHERE ((cm.church_id = g.church_id) AND (cm.user_id = (select auth.uid())))))) OR (g.created_by = (select auth.uid())) OR private.is_church_admin((select auth.uid()), g.church_id)))))));

DROP POLICY IF EXISTS "group members leave" ON public.group_members;
CREATE POLICY "group members leave" ON public.group_members FOR DELETE TO authenticated
USING ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "group members readable" ON public.group_members;
CREATE POLICY "group members readable" ON public.group_members FOR SELECT TO authenticated
USING (((user_id = (select auth.uid())) OR private.is_group_member((select auth.uid()), group_id) OR (EXISTS ( SELECT 1
   FROM groups g
  WHERE ((g.id = group_members.group_id) AND (g.created_by = (select auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM groups g
  WHERE ((g.id = group_members.group_id) AND (g.church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), g.church_id)))) OR private.is_staff((select auth.uid()))));

DROP POLICY IF EXISTS "groups create" ON public.groups;
CREATE POLICY "groups create" ON public.groups FOR INSERT TO authenticated
WITH CHECK (((created_by = (select auth.uid())) AND ((church_id IS NULL) OR private.is_church_admin((select auth.uid()), church_id))));

DROP POLICY IF EXISTS "groups readable" ON public.groups;
CREATE POLICY "groups readable" ON public.groups FOR SELECT
USING (((privacy = 'public'::group_privacy) OR (created_by = (select auth.uid())) OR private.is_group_member((select auth.uid()), id) OR private.is_staff((select auth.uid()))));

DROP POLICY IF EXISTS "groups update own" ON public.groups;
CREATE POLICY "groups update own" ON public.groups FOR UPDATE TO authenticated
USING (((created_by = (select auth.uid())) OR private.is_church_admin((select auth.uid()), church_id)))
WITH CHECK ((((created_by = (select auth.uid())) AND ((church_id IS NULL) OR private.is_church_admin((select auth.uid()), church_id))) OR private.is_church_admin((select auth.uid()), church_id)));

DROP POLICY IF EXISTS "staff manage categories" ON public.media_categories;
CREATE POLICY "staff manage categories" ON public.media_categories FOR ALL TO authenticated
USING (private.is_staff((select auth.uid())))
WITH CHECK (private.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "own media history" ON public.media_history;
CREATE POLICY "own media history" ON public.media_history FOR ALL TO authenticated
USING (((select auth.uid()) = user_id))
WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "staff manage item categories" ON public.media_item_categories;
CREATE POLICY "staff manage item categories" ON public.media_item_categories FOR ALL TO authenticated
USING (private.is_staff((select auth.uid())))
WITH CHECK (private.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "approved items readable" ON public.media_items;
CREATE POLICY "approved items readable" ON public.media_items FOR SELECT TO authenticated
USING ((is_approved OR private.is_staff((select auth.uid())) OR ((church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), church_id))));

DROP POLICY IF EXISTS "staff and church admins add items" ON public.media_items;
CREATE POLICY "staff and church admins add items" ON public.media_items FOR INSERT TO authenticated
WITH CHECK ((private.is_staff((select auth.uid())) OR ((church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), church_id))));

DROP POLICY IF EXISTS "staff and church admins edit items" ON public.media_items;
CREATE POLICY "staff and church admins edit items" ON public.media_items FOR UPDATE TO authenticated
USING ((private.is_staff((select auth.uid())) OR ((church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), church_id))))
WITH CHECK ((private.is_staff((select auth.uid())) OR ((church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), church_id))));

DROP POLICY IF EXISTS "staff delete items" ON public.media_items;
CREATE POLICY "staff delete items" ON public.media_items FOR DELETE TO authenticated
USING (private.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "staff manage playlist items" ON public.media_playlist_items;
CREATE POLICY "staff manage playlist items" ON public.media_playlist_items FOR ALL TO authenticated
USING (private.is_staff((select auth.uid())))
WITH CHECK (private.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "approved playlists readable" ON public.media_playlists;
CREATE POLICY "approved playlists readable" ON public.media_playlists FOR SELECT TO authenticated
USING ((is_approved OR private.is_staff((select auth.uid())) OR ((church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), church_id))));

DROP POLICY IF EXISTS "staff and church admins add playlists" ON public.media_playlists;
CREATE POLICY "staff and church admins add playlists" ON public.media_playlists FOR INSERT TO authenticated
WITH CHECK ((private.is_staff((select auth.uid())) OR ((church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), church_id))));

DROP POLICY IF EXISTS "staff and church admins edit playlists" ON public.media_playlists;
CREATE POLICY "staff and church admins edit playlists" ON public.media_playlists FOR UPDATE TO authenticated
USING ((private.is_staff((select auth.uid())) OR ((church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), church_id))))
WITH CHECK ((private.is_staff((select auth.uid())) OR ((church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), church_id))));

DROP POLICY IF EXISTS "staff delete playlists" ON public.media_playlists;
CREATE POLICY "staff delete playlists" ON public.media_playlists FOR DELETE TO authenticated
USING (private.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "approved sources readable" ON public.media_sources;
CREATE POLICY "approved sources readable" ON public.media_sources FOR SELECT TO authenticated
USING ((is_approved OR private.is_staff((select auth.uid())) OR ((church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), church_id))));

DROP POLICY IF EXISTS "staff and church admins add sources" ON public.media_sources;
CREATE POLICY "staff and church admins add sources" ON public.media_sources FOR INSERT TO authenticated
WITH CHECK ((private.is_staff((select auth.uid())) OR ((church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), church_id))));

DROP POLICY IF EXISTS "staff and church admins edit sources" ON public.media_sources;
CREATE POLICY "staff and church admins edit sources" ON public.media_sources FOR UPDATE TO authenticated
USING ((private.is_staff((select auth.uid())) OR ((church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), church_id))))
WITH CHECK ((private.is_staff((select auth.uid())) OR ((church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), church_id))));

DROP POLICY IF EXISTS "staff delete sources" ON public.media_sources;
CREATE POLICY "staff delete sources" ON public.media_sources FOR DELETE TO authenticated
USING (private.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "mentors update own" ON public.mentors;
CREATE POLICY "mentors update own" ON public.mentors FOR UPDATE TO authenticated
USING ((user_id = (select auth.uid())))
WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "mentorship request own" ON public.mentorship_requests;
CREATE POLICY "mentorship request own" ON public.mentorship_requests FOR INSERT TO authenticated
WITH CHECK ((requester_id = (select auth.uid())));

DROP POLICY IF EXISTS "mentorship update parties" ON public.mentorship_requests;
CREATE POLICY "mentorship update parties" ON public.mentorship_requests FOR UPDATE TO authenticated
USING (((requester_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM mentors m
  WHERE ((m.id = mentorship_requests.mentor_id) AND (m.user_id = (select auth.uid())))))))
WITH CHECK (true);

DROP POLICY IF EXISTS "mentorship visible to parties" ON public.mentorship_requests;
CREATE POLICY "mentorship visible to parties" ON public.mentorship_requests FOR SELECT TO authenticated
USING (((requester_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM mentors m
  WHERE ((m.id = mentorship_requests.mentor_id) AND (m.user_id = (select auth.uid()))))) OR private.is_staff((select auth.uid()))));

DROP POLICY IF EXISTS "notifications own" ON public.notifications;
CREATE POLICY "notifications own" ON public.notifications FOR ALL TO authenticated
USING ((user_id = (select auth.uid())))
WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "comments delete own" ON public.post_comments;
CREATE POLICY "comments delete own" ON public.post_comments FOR DELETE TO authenticated
USING (((author_id = (select auth.uid())) OR private.is_staff((select auth.uid()))));

DROP POLICY IF EXISTS "comments own" ON public.post_comments;
CREATE POLICY "comments own" ON public.post_comments FOR INSERT TO authenticated
WITH CHECK (((author_id = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM posts p
  WHERE ((p.id = post_comments.post_id) AND ((p.group_id IS NULL) OR (EXISTS ( SELECT 1
           FROM groups g
          WHERE ((g.id = p.group_id) AND (g.privacy = 'public'::group_privacy)))) OR private.is_group_member((select auth.uid()), p.group_id)))))));

DROP POLICY IF EXISTS "comments readable" ON public.post_comments;
CREATE POLICY "comments readable" ON public.post_comments FOR SELECT TO authenticated
USING ((EXISTS ( SELECT 1
   FROM posts p
  WHERE ((p.id = post_comments.post_id) AND ((p.group_id IS NULL) OR (EXISTS ( SELECT 1
           FROM groups g
          WHERE ((g.id = p.group_id) AND (g.privacy = 'public'::group_privacy)))) OR private.is_group_member((select auth.uid()), p.group_id))))));

DROP POLICY IF EXISTS "likes own" ON public.post_likes;
CREATE POLICY "likes own" ON public.post_likes FOR INSERT TO authenticated
WITH CHECK (((user_id = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM posts p
  WHERE ((p.id = post_likes.post_id) AND ((p.group_id IS NULL) OR (EXISTS ( SELECT 1
           FROM groups g
          WHERE ((g.id = p.group_id) AND (g.privacy = 'public'::group_privacy)))) OR private.is_group_member((select auth.uid()), p.group_id)))))));

DROP POLICY IF EXISTS "likes readable" ON public.post_likes;
CREATE POLICY "likes readable" ON public.post_likes FOR SELECT TO authenticated
USING ((EXISTS ( SELECT 1
   FROM posts p
  WHERE ((p.id = post_likes.post_id) AND ((p.group_id IS NULL) OR (EXISTS ( SELECT 1
           FROM groups g
          WHERE ((g.id = p.group_id) AND (g.privacy = 'public'::group_privacy)))) OR private.is_group_member((select auth.uid()), p.group_id))))));

DROP POLICY IF EXISTS "unlike own" ON public.post_likes;
CREATE POLICY "unlike own" ON public.post_likes FOR DELETE TO authenticated
USING ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "posts delete own" ON public.posts;
CREATE POLICY "posts delete own" ON public.posts FOR DELETE TO authenticated
USING (((author_id = (select auth.uid())) OR private.is_staff((select auth.uid()))));

DROP POLICY IF EXISTS "posts insert own" ON public.posts;
CREATE POLICY "posts insert own" ON public.posts FOR INSERT TO authenticated
WITH CHECK ((author_id = (select auth.uid())));

DROP POLICY IF EXISTS "posts readable" ON public.posts;
CREATE POLICY "posts readable" ON public.posts FOR SELECT TO authenticated
USING (((group_id IS NULL) OR (EXISTS ( SELECT 1
   FROM groups g
  WHERE ((g.id = posts.group_id) AND (g.privacy = 'public'::group_privacy)))) OR private.is_group_member((select auth.uid()), group_id)));

DROP POLICY IF EXISTS "posts update own" ON public.posts;
CREATE POLICY "posts update own" ON public.posts FOR UPDATE TO authenticated
USING ((author_id = (select auth.uid())))
WITH CHECK ((author_id = (select auth.uid())));

DROP POLICY IF EXISTS "Private prayer journal" ON public.prayer_journal;
CREATE POLICY "Private prayer journal" ON public.prayer_journal FOR ALL TO authenticated
USING (((select auth.uid()) = user_id))
WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "prayers delete own" ON public.prayer_requests;
CREATE POLICY "prayers delete own" ON public.prayer_requests FOR DELETE TO authenticated
USING (((user_id = (select auth.uid())) OR private.is_prayer_owner((select auth.uid()), id) OR private.is_staff((select auth.uid()))));

DROP POLICY IF EXISTS "prayers own" ON public.prayer_requests;
CREATE POLICY "prayers own" ON public.prayer_requests FOR INSERT TO authenticated
WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "prayer support own" ON public.prayer_support;
CREATE POLICY "prayer support own" ON public.prayer_support FOR ALL TO authenticated
USING ((user_id = (select auth.uid())))
WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "profiles insert own" ON public.profiles;
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (((select auth.uid()) = id));

DROP POLICY IF EXISTS "profiles update own" ON public.profiles;
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated
USING (((select auth.uid()) = id))
WITH CHECK (((select auth.uid()) = id));

DROP POLICY IF EXISTS "Delete own comment likes" ON public.reel_comment_likes;
CREATE POLICY "Delete own comment likes" ON public.reel_comment_likes FOR DELETE TO authenticated
USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Manage own comment likes" ON public.reel_comment_likes;
CREATE POLICY "Manage own comment likes" ON public.reel_comment_likes FOR INSERT TO authenticated
WITH CHECK ((((select auth.uid()) = user_id) AND (EXISTS ( SELECT 1
   FROM (reel_comments rc
     JOIN reels r ON ((r.id = rc.reel_id)))
  WHERE ((rc.id = reel_comment_likes.comment_id) AND (((r.status = 'published'::text) AND r.is_public) OR (r.author_id = (select auth.uid())) OR (r.uploaded_by = (select auth.uid())) OR private.is_staff((select auth.uid())) OR ((r.church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), r.church_id))))))));

DROP POLICY IF EXISTS "Read comment likes" ON public.reel_comment_likes;
CREATE POLICY "Read comment likes" ON public.reel_comment_likes FOR SELECT TO authenticated
USING ((EXISTS ( SELECT 1
   FROM (reel_comments rc
     JOIN reels r ON ((r.id = rc.reel_id)))
  WHERE ((rc.id = reel_comment_likes.comment_id) AND (((r.status = 'published'::text) AND r.is_public) OR (r.author_id = (select auth.uid())) OR (r.uploaded_by = (select auth.uid())) OR private.is_staff((select auth.uid())) OR ((r.church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), r.church_id)))))));

DROP POLICY IF EXISTS "Anyone signed in can read reel comments" ON public.reel_comments;
CREATE POLICY "Anyone signed in can read reel comments" ON public.reel_comments FOR SELECT TO authenticated
USING ((EXISTS ( SELECT 1
   FROM reels r
  WHERE ((r.id = reel_comments.reel_id) AND (((r.status = 'published'::text) AND r.is_public) OR (r.author_id = (select auth.uid())) OR (r.uploaded_by = (select auth.uid())) OR private.is_staff((select auth.uid())) OR ((r.church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), r.church_id)))))));

DROP POLICY IF EXISTS "Users or moderators delete reel comments" ON public.reel_comments;
CREATE POLICY "Users or moderators delete reel comments" ON public.reel_comments FOR DELETE TO authenticated
USING ((((select auth.uid()) = user_id) OR private.is_staff((select auth.uid())) OR (EXISTS ( SELECT 1
   FROM reels r
  WHERE ((r.id = reel_comments.reel_id) AND ((r.author_id = (select auth.uid())) OR ((r.church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), r.church_id))))))));

DROP POLICY IF EXISTS "Users update own reel comments or creator pins" ON public.reel_comments;
CREATE POLICY "Users update own reel comments or creator pins" ON public.reel_comments FOR UPDATE TO authenticated
USING ((((select auth.uid()) = user_id) OR ((select auth.uid()) = ( SELECT r.author_id
   FROM reels r
  WHERE (r.id = reel_comments.reel_id)))))
WITH CHECK ((((select auth.uid()) = user_id) OR ((select auth.uid()) = ( SELECT r.author_id
   FROM reels r
  WHERE (r.id = reel_comments.reel_id)))));

DROP POLICY IF EXISTS "Users write own reel comments" ON public.reel_comments;
CREATE POLICY "Users write own reel comments" ON public.reel_comments FOR INSERT TO authenticated
WITH CHECK ((((select auth.uid()) = user_id) AND (EXISTS ( SELECT 1
   FROM reels r
  WHERE ((r.id = reel_comments.reel_id) AND (((r.status = 'published'::text) AND r.is_public) OR (r.author_id = (select auth.uid())) OR (r.uploaded_by = (select auth.uid())) OR private.is_staff((select auth.uid())) OR ((r.church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), r.church_id))))))));

DROP POLICY IF EXISTS "Own reel feedback" ON public.reel_feedback;
CREATE POLICY "Own reel feedback" ON public.reel_feedback FOR ALL TO authenticated
USING ((user_id = (select auth.uid())))
WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "reel likes own" ON public.reel_likes;
CREATE POLICY "reel likes own" ON public.reel_likes FOR INSERT TO authenticated
WITH CHECK (((user_id = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM reels r
  WHERE ((r.id = reel_likes.reel_id) AND (((r.status = 'published'::text) AND r.is_public) OR (r.author_id = (select auth.uid())) OR (r.uploaded_by = (select auth.uid())) OR private.is_staff((select auth.uid())) OR ((r.church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), r.church_id))))))));

DROP POLICY IF EXISTS "reel likes readable" ON public.reel_likes;
CREATE POLICY "reel likes readable" ON public.reel_likes FOR SELECT TO authenticated
USING ((EXISTS ( SELECT 1
   FROM reels r
  WHERE ((r.id = reel_likes.reel_id) AND (((r.status = 'published'::text) AND r.is_public) OR (r.author_id = (select auth.uid())) OR (r.uploaded_by = (select auth.uid())) OR private.is_staff((select auth.uid())) OR ((r.church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), r.church_id)))))));

DROP POLICY IF EXISTS "reel unlike own" ON public.reel_likes;
CREATE POLICY "reel unlike own" ON public.reel_likes FOR DELETE TO authenticated
USING ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Moderators update reports" ON public.reel_reports;
CREATE POLICY "Moderators update reports" ON public.reel_reports FOR UPDATE TO authenticated
USING ((private.is_staff((select auth.uid())) OR (EXISTS ( SELECT 1
   FROM reels r
  WHERE ((r.id = reel_reports.reel_id) AND (r.church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), r.church_id))))))
WITH CHECK ((private.is_staff((select auth.uid())) OR (EXISTS ( SELECT 1
   FROM reels r
  WHERE ((r.id = reel_reports.reel_id) AND (r.church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), r.church_id))))));

DROP POLICY IF EXISTS "Reporters and moderators read reports" ON public.reel_reports;
CREATE POLICY "Reporters and moderators read reports" ON public.reel_reports FOR SELECT TO authenticated
USING ((((select auth.uid()) = reported_by) OR private.is_staff((select auth.uid())) OR (EXISTS ( SELECT 1
   FROM reels r
  WHERE ((r.id = reel_reports.reel_id) AND (r.church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), r.church_id))))));

DROP POLICY IF EXISTS "Users create reel reports" ON public.reel_reports;
CREATE POLICY "Users create reel reports" ON public.reel_reports FOR INSERT TO authenticated
WITH CHECK (((select auth.uid()) = reported_by));

DROP POLICY IF EXISTS "Users insert own views" ON public.reel_views;
CREATE POLICY "Users insert own views" ON public.reel_views FOR INSERT TO authenticated
WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Users read own views" ON public.reel_views;
CREATE POLICY "Users read own views" ON public.reel_views FOR SELECT TO authenticated
USING (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "reels delete own" ON public.reels;
CREATE POLICY "reels delete own" ON public.reels FOR DELETE TO authenticated
USING (((author_id = (select auth.uid())) OR private.is_staff((select auth.uid()))));

DROP POLICY IF EXISTS "reels insert own or managed" ON public.reels;
CREATE POLICY "reels insert own or managed" ON public.reels FOR INSERT TO authenticated
WITH CHECK ((private.is_staff((select auth.uid())) OR ((church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), church_id)) OR ((author_id = (select auth.uid())) AND ((church_id IS NULL) OR private.is_church_member((select auth.uid()), church_id)))));

DROP POLICY IF EXISTS "reels owners managers readable" ON public.reels;
CREATE POLICY "reels owners managers readable" ON public.reels FOR SELECT TO authenticated
USING (((author_id = (select auth.uid())) OR (uploaded_by = (select auth.uid())) OR private.is_staff((select auth.uid())) OR ((church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), church_id))));

DROP POLICY IF EXISTS "reels update own or managed" ON public.reels;
CREATE POLICY "reels update own or managed" ON public.reels FOR UPDATE TO authenticated
USING (((author_id = (select auth.uid())) OR private.is_staff((select auth.uid())) OR ((church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), church_id))))
WITH CHECK ((private.is_staff((select auth.uid())) OR ((church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), church_id)) OR ((author_id = (select auth.uid())) AND ((church_id IS NULL) OR private.is_church_member((select auth.uid()), church_id)))));

DROP POLICY IF EXISTS "reports create" ON public.reports;
CREATE POLICY "reports create" ON public.reports FOR INSERT TO authenticated
WITH CHECK ((reporter_id = (select auth.uid())));

DROP POLICY IF EXISTS "reports moderate" ON public.reports;
CREATE POLICY "reports moderate" ON public.reports FOR UPDATE TO authenticated
USING (private.is_staff((select auth.uid())))
WITH CHECK (private.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "reports visible" ON public.reports;
CREATE POLICY "reports visible" ON public.reports FOR SELECT TO authenticated
USING (((reporter_id = (select auth.uid())) OR private.is_staff((select auth.uid()))));

DROP POLICY IF EXISTS "saved own" ON public.saved_posts;
CREATE POLICY "saved own" ON public.saved_posts FOR ALL TO authenticated
USING ((user_id = (select auth.uid())))
WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "saved reels own" ON public.saved_reels;
CREATE POLICY "saved reels own" ON public.saved_reels FOR ALL TO authenticated
USING ((user_id = (select auth.uid())))
WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Own saved scriptures" ON public.saved_scriptures;
CREATE POLICY "Own saved scriptures" ON public.saved_scriptures FOR ALL TO authenticated
USING ((user_id = (select auth.uid())))
WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Own reflections" ON public.scripture_reflections;
CREATE POLICY "Own reflections" ON public.scripture_reflections FOR ALL TO authenticated
USING ((user_id = (select auth.uid())))
WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Authors read their own series" ON public.scripture_series;
CREATE POLICY "Authors read their own series" ON public.scripture_series FOR SELECT TO authenticated
USING ((author_id = (select auth.uid())));

DROP POLICY IF EXISTS "Church admins draft their church series" ON public.scripture_series;
CREATE POLICY "Church admins draft their church series" ON public.scripture_series FOR INSERT TO authenticated
WITH CHECK (((author_id = (select auth.uid())) AND (church_id IS NOT NULL) AND (status <> 'published'::text) AND private.is_church_admin((select auth.uid()), church_id)));

DROP POLICY IF EXISTS "Church admins update their church series" ON public.scripture_series;
CREATE POLICY "Church admins update their church series" ON public.scripture_series FOR UPDATE TO authenticated
USING (((author_id = (select auth.uid())) AND (church_id IS NOT NULL) AND private.is_church_admin((select auth.uid()), church_id)))
WITH CHECK (((author_id = (select auth.uid())) AND (church_id IS NOT NULL) AND (status <> 'published'::text) AND private.is_church_admin((select auth.uid()), church_id)));

DROP POLICY IF EXISTS "Reviewers manage series" ON public.scripture_series;
CREATE POLICY "Reviewers manage series" ON public.scripture_series FOR ALL TO authenticated
USING ((private.has_role((select auth.uid()), 'super_admin'::app_role) OR private.has_role((select auth.uid()), 'moderator'::app_role)))
WITH CHECK ((private.has_role((select auth.uid()), 'super_admin'::app_role) OR private.has_role((select auth.uid()), 'moderator'::app_role)));

DROP POLICY IF EXISTS "Reviewers manage sessions" ON public.scripture_series_sessions;
CREATE POLICY "Reviewers manage sessions" ON public.scripture_series_sessions FOR ALL TO authenticated
USING ((private.has_role((select auth.uid()), 'super_admin'::app_role) OR private.has_role((select auth.uid()), 'moderator'::app_role)))
WITH CHECK ((private.has_role((select auth.uid()), 'super_admin'::app_role) OR private.has_role((select auth.uid()), 'moderator'::app_role)));

DROP POLICY IF EXISTS "Sessions of readable series" ON public.scripture_series_sessions;
CREATE POLICY "Sessions of readable series" ON public.scripture_series_sessions FOR SELECT
USING ((EXISTS ( SELECT 1
   FROM scripture_series s
  WHERE ((s.id = scripture_series_sessions.series_id) AND ((s.status = 'published'::text) OR (s.author_id = (select auth.uid())))))));

DROP POLICY IF EXISTS "own searches insert" ON public.search_logs;
CREATE POLICY "own searches insert" ON public.search_logs FOR INSERT TO authenticated
WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "staff read searches" ON public.search_logs;
CREATE POLICY "staff read searches" ON public.search_logs FOR SELECT TO authenticated
USING (private.is_staff((select auth.uid())));

DROP POLICY IF EXISTS "Own series progress" ON public.series_progress;
CREATE POLICY "Own series progress" ON public.series_progress FOR ALL TO authenticated
USING ((user_id = (select auth.uid())))
WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Own session progress" ON public.session_progress;
CREATE POLICY "Own session progress" ON public.session_progress FOR ALL TO authenticated
USING ((user_id = (select auth.uid())))
WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Reviewers manage session scriptures" ON public.session_scriptures;
CREATE POLICY "Reviewers manage session scriptures" ON public.session_scriptures FOR ALL TO authenticated
USING ((private.has_role((select auth.uid()), 'super_admin'::app_role) OR private.has_role((select auth.uid()), 'moderator'::app_role)))
WITH CHECK ((private.has_role((select auth.uid()), 'super_admin'::app_role) OR private.has_role((select auth.uid()), 'moderator'::app_role)));

DROP POLICY IF EXISTS "Scriptures of readable sessions" ON public.session_scriptures;
CREATE POLICY "Scriptures of readable sessions" ON public.session_scriptures FOR SELECT
USING ((EXISTS ( SELECT 1
   FROM (scripture_series_sessions ss
     JOIN scripture_series s ON ((s.id = ss.series_id)))
  WHERE ((ss.id = session_scriptures.session_id) AND ((s.status = 'published'::text) OR (s.author_id = (select auth.uid())))))));

DROP POLICY IF EXISTS "follow own" ON public.user_follows;
CREATE POLICY "follow own" ON public.user_follows FOR INSERT TO authenticated
WITH CHECK ((follower_id = (select auth.uid())));

DROP POLICY IF EXISTS "unfollow own" ON public.user_follows;
CREATE POLICY "unfollow own" ON public.user_follows FOR DELETE TO authenticated
USING ((follower_id = (select auth.uid())));

DROP POLICY IF EXISTS "interests own" ON public.user_interests;
CREATE POLICY "interests own" ON public.user_interests FOR ALL TO authenticated
USING ((user_id = (select auth.uid())))
WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "own media follows" ON public.user_media_follows;
CREATE POLICY "own media follows" ON public.user_media_follows FOR ALL TO authenticated
USING (((select auth.uid()) = user_id))
WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "own media saves" ON public.user_media_saves;
CREATE POLICY "own media saves" ON public.user_media_saves FOR ALL TO authenticated
USING (((select auth.uid()) = user_id))
WITH CHECK (((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "reading progress own" ON public.user_reading_progress;
CREATE POLICY "reading progress own" ON public.user_reading_progress FOR ALL TO authenticated
USING ((user_id = (select auth.uid())))
WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "roles readable by owner" ON public.user_roles;
CREATE POLICY "roles readable by owner" ON public.user_roles FOR SELECT TO authenticated
USING (((user_id = (select auth.uid())) OR private.is_staff((select auth.uid()))));

COMMIT;
