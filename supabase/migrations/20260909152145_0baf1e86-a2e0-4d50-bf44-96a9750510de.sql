
-- ============ REELS EXTENSIONS ============
ALTER TABLE public.reels
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_bible_teaching boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
  ALTER TABLE public.reels ADD CONSTRAINT reels_status_check
    CHECK (status IN ('published','pending','removed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS reels_status_created_idx ON public.reels(status, created_at DESC);
CREATE INDEX IF NOT EXISTS reels_church_idx ON public.reels(church_id);
CREATE INDEX IF NOT EXISTS reels_topic_idx ON public.reels(topic);
CREATE INDEX IF NOT EXISTS reels_author_idx ON public.reels(author_id);

DROP TRIGGER IF EXISTS reels_updated ON public.reels;
CREATE TRIGGER reels_updated BEFORE UPDATE ON public.reels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- allow authors to update/insert their own reels
DROP POLICY IF EXISTS "Authors manage own reels" ON public.reels;
CREATE POLICY "Authors manage own reels" ON public.reels
  FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

-- verified badge on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

-- ============ REEL COMMENTS ============
CREATE TABLE IF NOT EXISTS public.reel_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES public.reel_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reel_comments TO authenticated;
GRANT ALL ON public.reel_comments TO service_role;
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS reel_comments_reel_idx ON public.reel_comments(reel_id, created_at);

DROP POLICY IF EXISTS "Anyone signed in can read reel comments" ON public.reel_comments;
CREATE POLICY "Anyone signed in can read reel comments" ON public.reel_comments
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users write own reel comments" ON public.reel_comments;
CREATE POLICY "Users write own reel comments" ON public.reel_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own reel comments or creator pins" ON public.reel_comments;
CREATE POLICY "Users update own reel comments or creator pins" ON public.reel_comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = (SELECT author_id FROM public.reels r WHERE r.id = reel_id))
  WITH CHECK (auth.uid() = user_id OR auth.uid() = (SELECT author_id FROM public.reels r WHERE r.id = reel_id));
DROP POLICY IF EXISTS "Users or moderators delete reel comments" ON public.reel_comments;
CREATE POLICY "Users or moderators delete reel comments" ON public.reel_comments
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() = (SELECT author_id FROM public.reels r WHERE r.id = reel_id)
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('moderator','church_admin','super_admin'))
  );

DROP TRIGGER IF EXISTS reel_comments_updated ON public.reel_comments;
CREATE TRIGGER reel_comments_updated BEFORE UPDATE ON public.reel_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- comment likes
CREATE TABLE IF NOT EXISTS public.reel_comment_likes (
  comment_id uuid NOT NULL REFERENCES public.reel_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.reel_comment_likes TO authenticated;
GRANT ALL ON public.reel_comment_likes TO service_role;
ALTER TABLE public.reel_comment_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read comment likes" ON public.reel_comment_likes;
CREATE POLICY "Read comment likes" ON public.reel_comment_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Manage own comment likes" ON public.reel_comment_likes;
CREATE POLICY "Manage own comment likes" ON public.reel_comment_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Delete own comment likes" ON public.reel_comment_likes;
CREATE POLICY "Delete own comment likes" ON public.reel_comment_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ REEL VIEWS ============
CREATE TABLE IF NOT EXISTS public.reel_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  watch_duration integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reel_views TO authenticated;
GRANT ALL ON public.reel_views TO service_role;
ALTER TABLE public.reel_views ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS reel_views_user_idx ON public.reel_views(user_id, created_at DESC);
DROP POLICY IF EXISTS "Users insert own views" ON public.reel_views;
CREATE POLICY "Users insert own views" ON public.reel_views
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users read own views" ON public.reel_views;
CREATE POLICY "Users read own views" ON public.reel_views
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ REEL REPORTS ============
CREATE TABLE IF NOT EXISTS public.reel_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','removed','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reel_reports TO authenticated;
GRANT ALL ON public.reel_reports TO service_role;
ALTER TABLE public.reel_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users create reel reports" ON public.reel_reports;
CREATE POLICY "Users create reel reports" ON public.reel_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reported_by);
DROP POLICY IF EXISTS "Reporters and moderators read reports" ON public.reel_reports;
CREATE POLICY "Reporters and moderators read reports" ON public.reel_reports
  FOR SELECT TO authenticated USING (
    auth.uid() = reported_by
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('moderator','church_admin','super_admin'))
  );
DROP POLICY IF EXISTS "Moderators update reports" ON public.reel_reports;
CREATE POLICY "Moderators update reports" ON public.reel_reports
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('moderator','church_admin','super_admin'))
  );

-- ============ PRAYER JOURNAL ============
CREATE TABLE IF NOT EXISTS public.prayer_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  content text NOT NULL,
  scripture_ref text,
  source text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prayer_journal TO authenticated;
GRANT ALL ON public.prayer_journal TO service_role;
ALTER TABLE public.prayer_journal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Private prayer journal" ON public.prayer_journal;
CREATE POLICY "Private prayer journal" ON public.prayer_journal
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ AI CONTEXT ============
ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS context_type text,
  ADD COLUMN IF NOT EXISTS context_id uuid,
  ADD COLUMN IF NOT EXISTS context_label text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS ai_conversations_updated ON public.ai_conversations;
CREATE TRIGGER ai_conversations_updated BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ai_messages ADD COLUMN IF NOT EXISTS sources jsonb;

CREATE TABLE IF NOT EXISTS public.ai_saved_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.ai_messages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);
GRANT SELECT, INSERT, DELETE ON public.ai_saved_responses TO authenticated;
GRANT ALL ON public.ai_saved_responses TO service_role;
ALTER TABLE public.ai_saved_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Private saved AI responses" ON public.ai_saved_responses;
CREATE POLICY "Private saved AI responses" ON public.ai_saved_responses
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ CHURCH RESOURCES (for My Church AI) ============
CREATE TABLE IF NOT EXISTS public.church_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.church_resources TO authenticated;
GRANT ALL ON public.church_resources TO service_role;
ALTER TABLE public.church_resources ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS church_resources_church_idx ON public.church_resources(church_id);
DROP POLICY IF EXISTS "Read approved church resources" ON public.church_resources;
CREATE POLICY "Read approved church resources" ON public.church_resources
  FOR SELECT TO authenticated USING (approved = true);
DROP TRIGGER IF EXISTS church_resources_updated ON public.church_resources;
CREATE TRIGGER church_resources_updated BEFORE UPDATE ON public.church_resources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ DEMO REELS ============
UPDATE public.reels SET topic = COALESCE(topic, 'Christian Life') WHERE topic IS NULL;

INSERT INTO public.reels (creator_name, creator_handle, caption, hashtags, scripture_ref, topic, is_bible_teaching, audio_title, like_count, comment_count)
SELECT * FROM (VALUES
  ('Grace Wanjiru','grace.wanjiru','Your identity is bigger than your mistakes.', ARRAY['Identity','Faith','GenZForChrist'], '2 Corinthians 5:17','Identity', true, 'Original audio — Grace Wanjiru', 1243, 124),
  ('Pastor Kelvin Otieno','ptr.kelvin','Three things to remember when prayer feels difficult.', ARRAY['Prayer','Faith'], 'Romans 8:26','Prayer', true, 'Original audio — Pastor Kelvin', 872, 61),
  ('Nuru Faith Learning','nuru.learning','What actually happens before baptism?', ARRAY['Baptism','ChurchLearning'], 'Acts 2:38','Church Learning', true, 'Original audio — Nuru Learning', 654, 48),
  ('Aisha Mwende','aisha.mwende','Faith doesn''t mean pretending everything is okay.', ARRAY['ChristianLife','MentalWellness'], 'Psalm 34:18','Christian Life', false, 'Original audio — Aisha Mwende', 2110, 233),
  ('Brian Kiptoo','brian.kiptoo','Matthew 5:14 explained in 60 seconds.', ARRAY['BibleTeaching','Light'], 'Matthew 5:14','Bible Teaching', true, 'Original audio — Brian Kiptoo', 1580, 97)
) AS v(creator_name, creator_handle, caption, hashtags, scripture_ref, topic, is_bible_teaching, audio_title, like_count, comment_count)
WHERE NOT EXISTS (SELECT 1 FROM public.reels WHERE creator_handle = v.creator_handle AND caption = v.caption);
