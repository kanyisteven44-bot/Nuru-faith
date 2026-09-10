-- Preserve existing tables; enforce review and verification at the database boundary.
BEGIN;

CREATE OR REPLACE FUNCTION private.protect_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' OR private.is_staff(auth.uid()) THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.verified THEN RAISE EXCEPTION 'Verification requires staff review'; END IF;
  ELSIF NEW.verified IS DISTINCT FROM OLD.verified THEN
    RAISE EXCEPTION 'Verification requires staff review';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.protect_verification() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_profile_verification BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.protect_verification();
CREATE TRIGGER protect_church_verification BEFORE INSERT OR UPDATE ON public.churches
FOR EACH ROW EXECUTE FUNCTION private.protect_verification();
CREATE TRIGGER protect_mentor_verification BEFORE INSERT OR UPDATE ON public.mentors
FOR EACH ROW EXECUTE FUNCTION private.protect_verification();

-- Church admins may submit drafts; staff review publication and all edits to published content.
CREATE OR REPLACE FUNCTION private.protect_media_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' OR private.is_staff(auth.uid()) THEN RETURN NEW; END IF;
  IF NEW.is_approved THEN RAISE EXCEPTION 'Publication requires staff review'; END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_approved THEN RAISE EXCEPTION 'Published content requires staff review'; END IF;
  IF TG_TABLE_NAME = 'media_sources' THEN
    IF NEW.is_verified THEN RAISE EXCEPTION 'Verification requires staff review'; END IF;
  ELSE
    IF NEW.is_featured THEN RAISE EXCEPTION 'Featuring requires staff review'; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.protect_media_review() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_media_source_review BEFORE INSERT OR UPDATE ON public.media_sources
FOR EACH ROW EXECUTE FUNCTION private.protect_media_review();
CREATE TRIGGER protect_media_item_review BEFORE INSERT OR UPDATE ON public.media_items
FOR EACH ROW EXECUTE FUNCTION private.protect_media_review();
CREATE TRIGGER protect_media_playlist_review BEFORE INSERT OR UPDATE ON public.media_playlists
FOR EACH ROW EXECUTE FUNCTION private.protect_media_review();

-- Existing permissive join policy allowed users to join private groups by guessing their IDs.
DROP POLICY "group members join" ON public.group_members;
CREATE POLICY "group members join" ON public.group_members FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.groups g WHERE g.id = group_id AND (
      g.privacy = 'public'
      OR (g.privacy = 'church_only' AND EXISTS (
        SELECT 1 FROM public.church_members cm WHERE cm.church_id = g.church_id AND cm.user_id = auth.uid()
      ))
      OR g.created_by = auth.uid()
      OR private.is_church_admin(auth.uid(), g.church_id)
    )
  )
);

-- AI messages must belong to a conversation owned by their author.
-- Retain the existing permissive ownership policies; add a restrictive conversation check.
CREATE POLICY "messages conversation boundary" ON public.ai_messages AS RESTRICTIVE FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));

-- Keep a request's parties immutable; prevent moving a private request to another recipient.
CREATE OR REPLACE FUNCTION private.protect_mentorship_parties()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'authenticated' AND
    (NEW.mentor_id IS DISTINCT FROM OLD.mentor_id OR NEW.requester_id IS DISTINCT FROM OLD.requester_id) THEN
    RAISE EXCEPTION 'Mentorship participants cannot be changed';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.protect_mentorship_parties() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_mentorship_parties BEFORE UPDATE ON public.mentorship_requests
FOR EACH ROW EXECUTE FUNCTION private.protect_mentorship_parties();

COMMIT;


