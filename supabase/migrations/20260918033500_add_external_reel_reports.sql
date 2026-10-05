-- Moderation reports for externally sourced Reels (for example YouTube videos).
-- These Reels have text external ids rather than rows in public.reels, so they
-- cannot use public.reel_reports whose reel_id is a UUID foreign key.

CREATE TABLE IF NOT EXISTS public.external_reel_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_reel_id text NOT NULL,
  reported_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text CHECK (details IS NULL OR char_length(details) <= 500),
  source_url text,
  creator_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (external_reel_id, reported_by)
);

GRANT SELECT, INSERT, UPDATE ON public.external_reel_reports TO authenticated;
GRANT ALL ON public.external_reel_reports TO service_role;

ALTER TABLE public.external_reel_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "external reel reports create own"
ON public.external_reel_reports
FOR INSERT TO authenticated
WITH CHECK (reported_by = (select auth.uid()));

CREATE POLICY "external reel reports visible"
ON public.external_reel_reports
FOR SELECT TO authenticated
USING (reported_by = (select auth.uid()) OR private.is_staff((select auth.uid())));

CREATE POLICY "external reel reports moderate"
ON public.external_reel_reports
FOR UPDATE TO authenticated
USING (private.is_staff((select auth.uid())))
WITH CHECK (private.is_staff((select auth.uid())));

CREATE INDEX IF NOT EXISTS idx_external_reel_reports_reported_by
ON public.external_reel_reports (reported_by);

CREATE INDEX IF NOT EXISTS idx_external_reel_reports_status_created
ON public.external_reel_reports (status, created_at DESC);
