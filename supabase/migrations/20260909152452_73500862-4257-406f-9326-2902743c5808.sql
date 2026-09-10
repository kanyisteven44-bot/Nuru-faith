
-- link reel comments to profiles so author name/avatar can be read
ALTER TABLE public.reel_comments
  DROP CONSTRAINT IF EXISTS reel_comments_user_id_profiles_fkey;
ALTER TABLE public.reel_comments
  ADD CONSTRAINT reel_comments_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- counters
CREATE OR REPLACE FUNCTION public.sync_reel_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reels SET like_count = like_count + 1 WHERE id = NEW.reel_id;
  ELSE
    UPDATE public.reels SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_reel_like_count ON public.reel_likes;
CREATE TRIGGER trg_reel_like_count
AFTER INSERT OR DELETE ON public.reel_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_reel_like_count();

CREATE OR REPLACE FUNCTION public.sync_reel_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reels SET comment_count = comment_count + 1 WHERE id = NEW.reel_id;
  ELSE
    UPDATE public.reels SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_reel_comment_count ON public.reel_comments;
CREATE TRIGGER trg_reel_comment_count
AFTER INSERT OR DELETE ON public.reel_comments
FOR EACH ROW EXECUTE FUNCTION public.sync_reel_comment_count();

CREATE OR REPLACE FUNCTION public.sync_reel_comment_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reel_comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSE
    UPDATE public.reel_comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_reel_comment_like_count ON public.reel_comment_likes;
CREATE TRIGGER trg_reel_comment_like_count
AFTER INSERT OR DELETE ON public.reel_comment_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_reel_comment_like_count();

CREATE OR REPLACE FUNCTION public.sync_reel_view_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.reels SET view_count = view_count + 1 WHERE id = NEW.reel_id;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_reel_view_count ON public.reel_views;
CREATE TRIGGER trg_reel_view_count
AFTER INSERT ON public.reel_views
FOR EACH ROW EXECUTE FUNCTION public.sync_reel_view_count();
