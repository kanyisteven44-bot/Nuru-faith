
-- ---------- categories (shared taxonomy) ----------
CREATE TABLE public.media_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.media_categories TO authenticated, anon;
GRANT ALL ON public.media_categories TO service_role;
ALTER TABLE public.media_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories readable" ON public.media_categories FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "staff manage categories" ON public.media_categories FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

INSERT INTO public.media_categories (slug, name, position) VALUES
  ('faith','Faith',1),('bible','Bible',2),('prayer','Prayer',3),('worship','Worship',4),
  ('purpose','Purpose',5),('relationships','Relationships',6),('mental-wellness','Mental Wellness',7),
  ('university','University',8),('career','Career',9),('leadership','Leadership',10),
  ('church','Church',11),('discipleship','Discipleship',12),('baptism','Baptism',13),
  ('christian-living','Christian Living',14),('testimony','Testimony',15),
  ('service','Service',16),('family','Family',17);

-- ---------- sources ----------
CREATE TABLE public.media_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('youtube','nuru_audio','church_upload','podcast','sermon')),
  youtube_channel_id text,
  church_id uuid REFERENCES public.churches(id) ON DELETE SET NULL,
  organization_id uuid,
  description text,
  avatar_url text,
  is_verified boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX media_sources_yt_channel_key ON public.media_sources (youtube_channel_id) WHERE youtube_channel_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_sources TO authenticated;
GRANT ALL ON public.media_sources TO service_role;
ALTER TABLE public.media_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved sources readable" ON public.media_sources FOR SELECT TO authenticated
  USING (is_approved OR private.is_staff(auth.uid()) OR (church_id IS NOT NULL AND private.is_church_admin(auth.uid(), church_id)));
CREATE POLICY "staff and church admins add sources" ON public.media_sources FOR INSERT TO authenticated
  WITH CHECK (private.is_staff(auth.uid()) OR (church_id IS NOT NULL AND private.is_church_admin(auth.uid(), church_id)));
CREATE POLICY "staff and church admins edit sources" ON public.media_sources FOR UPDATE TO authenticated
  USING (private.is_staff(auth.uid()) OR (church_id IS NOT NULL AND private.is_church_admin(auth.uid(), church_id)))
  WITH CHECK (private.is_staff(auth.uid()) OR (church_id IS NOT NULL AND private.is_church_admin(auth.uid(), church_id)));
CREATE POLICY "staff delete sources" ON public.media_sources FOR DELETE TO authenticated
  USING (private.is_staff(auth.uid()));
CREATE TRIGGER media_sources_updated_at BEFORE UPDATE ON public.media_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- items ----------
CREATE TABLE public.media_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('youtube','nuru_audio','church_upload','podcast','sermon')),
  external_id text NOT NULL,
  source_id uuid REFERENCES public.media_sources(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  thumbnail_url text,
  media_type text NOT NULL DEFAULT 'video' CHECK (media_type IN ('video','playlist','channel','audio','podcast','sermon','music')),
  category text,
  creator_name text,
  youtube_channel_id text,
  church_id uuid REFERENCES public.churches(id) ON DELETE SET NULL,
  audio_url text,
  duration_seconds integer,
  scripture_ref text,
  published_at timestamptz,
  can_download boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_items_source_external_key UNIQUE (source, external_id),
  CONSTRAINT media_items_youtube_never_downloadable CHECK (source <> 'youtube' OR can_download = false)
);
CREATE INDEX media_items_featured_idx ON public.media_items (is_approved, is_featured, created_at DESC);
CREATE INDEX media_items_church_idx ON public.media_items (church_id);
CREATE INDEX media_items_type_idx ON public.media_items (media_type, category);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_items TO authenticated;
GRANT ALL ON public.media_items TO service_role;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved items readable" ON public.media_items FOR SELECT TO authenticated
  USING (is_approved OR private.is_staff(auth.uid()) OR (church_id IS NOT NULL AND private.is_church_admin(auth.uid(), church_id)));
CREATE POLICY "staff and church admins add items" ON public.media_items FOR INSERT TO authenticated
  WITH CHECK (private.is_staff(auth.uid()) OR (church_id IS NOT NULL AND private.is_church_admin(auth.uid(), church_id)));
CREATE POLICY "staff and church admins edit items" ON public.media_items FOR UPDATE TO authenticated
  USING (private.is_staff(auth.uid()) OR (church_id IS NOT NULL AND private.is_church_admin(auth.uid(), church_id)))
  WITH CHECK (private.is_staff(auth.uid()) OR (church_id IS NOT NULL AND private.is_church_admin(auth.uid(), church_id)));
CREATE POLICY "staff delete items" ON public.media_items FOR DELETE TO authenticated
  USING (private.is_staff(auth.uid()));
CREATE TRIGGER media_items_updated_at BEFORE UPDATE ON public.media_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.media_item_categories (
  item_id uuid NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.media_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, category_id)
);
GRANT SELECT, INSERT, DELETE ON public.media_item_categories TO authenticated;
GRANT ALL ON public.media_item_categories TO service_role;
ALTER TABLE public.media_item_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "item categories readable" ON public.media_item_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage item categories" ON public.media_item_categories FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

-- ---------- playlists ----------
CREATE TABLE public.media_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  cover_url text,
  kind text NOT NULL DEFAULT 'nuru' CHECK (kind IN ('nuru','church','youtube')),
  youtube_playlist_id text,
  church_id uuid REFERENCES public.churches(id) ON DELETE SET NULL,
  category text,
  is_featured boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_playlists TO authenticated;
GRANT ALL ON public.media_playlists TO service_role;
ALTER TABLE public.media_playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved playlists readable" ON public.media_playlists FOR SELECT TO authenticated
  USING (is_approved OR private.is_staff(auth.uid()) OR (church_id IS NOT NULL AND private.is_church_admin(auth.uid(), church_id)));
CREATE POLICY "staff and church admins add playlists" ON public.media_playlists FOR INSERT TO authenticated
  WITH CHECK (private.is_staff(auth.uid()) OR (church_id IS NOT NULL AND private.is_church_admin(auth.uid(), church_id)));
CREATE POLICY "staff and church admins edit playlists" ON public.media_playlists FOR UPDATE TO authenticated
  USING (private.is_staff(auth.uid()) OR (church_id IS NOT NULL AND private.is_church_admin(auth.uid(), church_id)))
  WITH CHECK (private.is_staff(auth.uid()) OR (church_id IS NOT NULL AND private.is_church_admin(auth.uid(), church_id)));
CREATE POLICY "staff delete playlists" ON public.media_playlists FOR DELETE TO authenticated
  USING (private.is_staff(auth.uid()));
CREATE TRIGGER media_playlists_updated_at BEFORE UPDATE ON public.media_playlists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.media_playlist_items (
  playlist_id uuid NOT NULL REFERENCES public.media_playlists(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (playlist_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_playlist_items TO authenticated;
GRANT ALL ON public.media_playlist_items TO service_role;
ALTER TABLE public.media_playlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "playlist items readable" ON public.media_playlist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage playlist items" ON public.media_playlist_items FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

-- ---------- per-user tables ----------
CREATE TABLE public.user_media_saves (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_media_saves TO authenticated;
GRANT ALL ON public.user_media_saves TO service_role;
ALTER TABLE public.user_media_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own media saves" ON public.user_media_saves FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.media_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.media_items(id) ON DELETE SET NULL,
  source text NOT NULL,
  external_id text,
  title text NOT NULL,
  thumbnail_url text,
  media_type text,
  progress_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_history_user_idx ON public.media_history (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_history TO authenticated;
GRANT ALL ON public.media_history TO service_role;
ALTER TABLE public.media_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own media history" ON public.media_history FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.user_media_follows (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.media_sources(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, source_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_media_follows TO authenticated;
GRANT ALL ON public.user_media_follows TO service_role;
ALTER TABLE public.user_media_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own media follows" ON public.user_media_follows FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
