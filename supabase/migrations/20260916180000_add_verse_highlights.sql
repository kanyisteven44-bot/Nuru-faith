CREATE TABLE IF NOT EXISTS public.verse_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference text NOT NULL,
  verse integer NOT NULL,
  verse_text text NOT NULL,
  color text NOT NULL DEFAULT 'yellow' CHECK (color IN ('yellow', 'green', 'blue', 'pink', 'purple')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reference, verse)
);

CREATE INDEX IF NOT EXISTS idx_verse_highlights_user_id ON public.verse_highlights (user_id);

ALTER TABLE public.verse_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own verse highlights" ON public.verse_highlights FOR ALL TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));
