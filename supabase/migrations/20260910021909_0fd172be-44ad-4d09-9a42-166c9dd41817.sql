-- 1. member roles for creators
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'creator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'verified_creator';

-- 2. reel source + rights metadata
ALTER TABLE public.reels
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'nuru_original',
  ADD COLUMN IF NOT EXISTS rights_status text NOT NULL DEFAULT 'owned',
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_url text,
  ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS devotional_id uuid REFERENCES public.devotionals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

ALTER TABLE public.reels DROP CONSTRAINT IF EXISTS reels_source_type_check;
ALTER TABLE public.reels ADD CONSTRAINT reels_source_type_check
  CHECK (source_type IN ('nuru_original','user_upload','church_upload','creator_upload','youtube'));

ALTER TABLE public.reels DROP CONSTRAINT IF EXISTS reels_rights_status_check;
ALTER TABLE public.reels ADD CONSTRAINT reels_rights_status_check
  CHECK (rights_status IN ('owned','licensed','permission_granted','external_embed'));

ALTER TABLE public.reels DROP CONSTRAINT IF EXISTS reels_status_check;
ALTER TABLE public.reels ADD CONSTRAINT reels_status_check
  CHECK (status IN ('draft','review','scheduled','published','archived'));

CREATE INDEX IF NOT EXISTS reels_source_type_idx ON public.reels (source_type);
CREATE INDEX IF NOT EXISTS reels_status_created_idx ON public.reels (status, created_at DESC);

DROP POLICY IF EXISTS "reels readable" ON public.reels;
CREATE POLICY "published reels readable" ON public.reels FOR SELECT
  USING (
    (status = 'published' AND is_public)
    OR author_id = auth.uid()
    OR uploaded_by = auth.uid()
    OR private.is_staff(auth.uid())
    OR (church_id IS NOT NULL AND private.is_church_admin(auth.uid(), church_id))
  );

DROP POLICY IF EXISTS "reels own" ON public.reels;
CREATE POLICY "reels insert own or managed" ON public.reels FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    OR private.is_staff(auth.uid())
    OR (church_id IS NOT NULL AND private.is_church_admin(auth.uid(), church_id))
  );

DROP POLICY IF EXISTS "Authors manage own reels" ON public.reels;
CREATE POLICY "reels update own or managed" ON public.reels FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid()
    OR private.is_staff(auth.uid())
    OR (church_id IS NOT NULL AND private.is_church_admin(auth.uid(), church_id))
  )
  WITH CHECK (
    author_id = auth.uid()
    OR private.is_staff(auth.uid())
    OR (church_id IS NOT NULL AND private.is_church_admin(auth.uid(), church_id))
  );

-- 3. approved YouTube channels (trust layer for discovery)
CREATE TABLE IF NOT EXISTS public.approved_youtube_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id text NOT NULL UNIQUE,
  channel_name text NOT NULL,
  category text,
  denomination text,
  country text,
  is_verified boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  trust_level text NOT NULL DEFAULT 'discovery',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT approved_youtube_channels_trust_check
    CHECK (trust_level IN ('official','verified','trusted','discovery','blocked'))
);

GRANT SELECT ON public.approved_youtube_channels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approved_youtube_channels TO authenticated;
GRANT ALL ON public.approved_youtube_channels TO service_role;

ALTER TABLE public.approved_youtube_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channels readable" ON public.approved_youtube_channels FOR SELECT USING (true);
CREATE POLICY "staff add channels" ON public.approved_youtube_channels FOR INSERT TO authenticated
  WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "staff edit channels" ON public.approved_youtube_channels FOR UPDATE TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "staff delete channels" ON public.approved_youtube_channels FOR DELETE TO authenticated
  USING (private.is_staff(auth.uid()));

CREATE TRIGGER approved_youtube_channels_updated
  BEFORE UPDATE ON public.approved_youtube_channels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. safe search analytics
CREATE TABLE IF NOT EXISTS public.search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  query text NOT NULL,
  normalized_category text,
  result_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.search_logs TO authenticated;
GRANT ALL ON public.search_logs TO service_role;

ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own searches insert" ON public.search_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "staff read searches" ON public.search_logs FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS search_logs_created_idx ON public.search_logs (created_at DESC);

-- 5. existing demo reels are Nuru-owned demo originals
UPDATE public.reels SET source_type = 'nuru_original', rights_status = 'owned' WHERE source_type IS NULL;
