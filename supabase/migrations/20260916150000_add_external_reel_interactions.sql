-- Likes, saves and comments for Reels sourced from YouTube (no row in public.reels
-- to hang the existing reel_likes/saved_reels/post_comments tables off of), keyed
-- by the external video id instead of a local reel_id.

CREATE TABLE public.external_reel_likes (
  external_reel_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (external_reel_id, user_id)
);
GRANT SELECT ON public.external_reel_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.external_reel_likes TO authenticated;
GRANT ALL ON public.external_reel_likes TO service_role;
ALTER TABLE public.external_reel_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "external reel likes readable" ON public.external_reel_likes FOR SELECT USING (true);
CREATE POLICY "external reel likes own" ON public.external_reel_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "external reel unlike own" ON public.external_reel_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.external_reel_saves (
  external_reel_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (external_reel_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.external_reel_saves TO authenticated;
GRANT ALL ON public.external_reel_saves TO service_role;
ALTER TABLE public.external_reel_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "external reel saves own" ON public.external_reel_saves FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.external_reel_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_reel_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 800),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.external_reel_comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.external_reel_comments TO authenticated;
GRANT ALL ON public.external_reel_comments TO service_role;
ALTER TABLE public.external_reel_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "external reel comments readable" ON public.external_reel_comments FOR SELECT USING (true);
CREATE POLICY "external reel comments own" ON public.external_reel_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "external reel comments delete own" ON public.external_reel_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR private.is_staff(auth.uid()));

CREATE INDEX external_reel_likes_reel_idx ON public.external_reel_likes (external_reel_id);
CREATE INDEX external_reel_saves_reel_idx ON public.external_reel_saves (external_reel_id);
CREATE INDEX external_reel_comments_reel_idx ON public.external_reel_comments (external_reel_id, created_at DESC);
