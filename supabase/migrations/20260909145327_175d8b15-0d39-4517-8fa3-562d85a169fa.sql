
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
CREATE OR REPLACE FUNCTION private.is_church_admin(_user_id uuid, _church_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND church_id = _church_id AND role = 'church_admin')
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
$$;
CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('moderator','super_admin'));
$$;
CREATE OR REPLACE FUNCTION private.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE user_id = _user_id AND group_id = _group_id);
$$;

DROP POLICY "churches super insert" ON public.churches;
CREATE POLICY "churches super insert" ON public.churches FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'super_admin'));

DROP POLICY "church members leave" ON public.church_members;
CREATE POLICY "church members leave" ON public.church_members FOR DELETE TO authenticated USING (user_id = auth.uid() OR private.is_church_admin(auth.uid(), church_id));

DROP POLICY "churches admin update" ON public.churches;
CREATE POLICY "churches admin update" ON public.churches FOR UPDATE TO authenticated USING (private.is_church_admin(auth.uid(), id)) WITH CHECK (private.is_church_admin(auth.uid(), id));

DROP POLICY "events admin delete" ON public.events;
CREATE POLICY "events admin delete" ON public.events FOR DELETE TO authenticated USING (created_by = auth.uid() OR private.is_church_admin(auth.uid(), church_id));
DROP POLICY "events admin update" ON public.events;
CREATE POLICY "events admin update" ON public.events FOR UPDATE TO authenticated USING (created_by = auth.uid() OR private.is_church_admin(auth.uid(), church_id)) WITH CHECK (true);

DROP POLICY "groups update own" ON public.groups;
CREATE POLICY "groups update own" ON public.groups FOR UPDATE TO authenticated USING (created_by = auth.uid() OR private.is_church_admin(auth.uid(), church_id)) WITH CHECK (true);
DROP POLICY "groups readable" ON public.groups;
CREATE POLICY "groups readable" ON public.groups FOR SELECT USING (privacy = 'public' OR private.is_group_member(auth.uid(), id) OR private.is_staff(auth.uid()));

DROP POLICY "posts readable" ON public.posts;
CREATE POLICY "posts readable" ON public.posts FOR SELECT USING (
  group_id IS NULL OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.privacy = 'public') OR private.is_group_member(auth.uid(), group_id)
);
DROP POLICY "posts delete own" ON public.posts;
CREATE POLICY "posts delete own" ON public.posts FOR DELETE TO authenticated USING (author_id = auth.uid() OR private.is_staff(auth.uid()));

DROP POLICY "mentorship visible to parties" ON public.mentorship_requests;
CREATE POLICY "mentorship visible to parties" ON public.mentorship_requests FOR SELECT TO authenticated USING (
  requester_id = auth.uid() OR EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = mentor_id AND m.user_id = auth.uid()) OR private.is_staff(auth.uid())
);

DROP POLICY "comments delete own" ON public.post_comments;
CREATE POLICY "comments delete own" ON public.post_comments FOR DELETE TO authenticated USING (author_id = auth.uid() OR private.is_staff(auth.uid()));

DROP POLICY "prayers delete own" ON public.prayer_requests;
CREATE POLICY "prayers delete own" ON public.prayer_requests FOR DELETE TO authenticated USING (user_id = auth.uid() OR private.is_staff(auth.uid()));

DROP POLICY "reels delete own" ON public.reels;
CREATE POLICY "reels delete own" ON public.reels FOR DELETE TO authenticated USING (author_id = auth.uid() OR private.is_staff(auth.uid()));

DROP POLICY "reports moderate" ON public.reports;
CREATE POLICY "reports moderate" ON public.reports FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (true);
DROP POLICY "reports visible" ON public.reports;
CREATE POLICY "reports visible" ON public.reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR private.is_staff(auth.uid()));

DROP POLICY "roles readable by owner" ON public.user_roles;
CREATE POLICY "roles readable by owner" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.is_staff(auth.uid()));

DROP FUNCTION public.has_role(uuid, public.app_role);
DROP FUNCTION public.is_church_admin(uuid, uuid);
DROP FUNCTION public.is_staff(uuid);
DROP FUNCTION public.is_group_member(uuid, uuid);
