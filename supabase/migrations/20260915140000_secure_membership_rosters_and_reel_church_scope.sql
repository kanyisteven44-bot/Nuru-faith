-- Security fix (production audit, 2026-09-15):
--
-- 1. church_members and group_members had `USING (true)` SELECT policies plus
--    `GRANT SELECT ... TO anon`, so any anonymous request could download the full
--    membership roster of every church and every group (including private ones).
--    Neither table's own RLS policy can query itself without recursion, so the new
--    policies reuse the existing SECURITY DEFINER helper pattern (private.is_staff,
--    private.is_church_admin) and add one new helper, private.is_church_member.
--
-- 2. "reels insert own or managed" / "reels update own or managed" accepted any
--    `church_id` as long as `author_id = auth.uid()`, so a plain user could attach
--    someone else's church to their own Reel. INSERT/UPDATE now require the author
--    to actually belong to that church (or be its admin, or platform staff) whenever
--    church_id is set; church_id = NULL (a personal Reel) still needs no membership.
--
-- No historical migration is modified; this only drops and recreates the specific
-- policies named below.
BEGIN;

-- ---------------------------------------------------------------------------
-- Helper: membership check for church_members, mirroring private.is_group_member.
-- SECURITY DEFINER (owned by the migration role, which bypasses RLS) so this can
-- be called from church_members' own SELECT policy without recursive RLS evaluation.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.is_church_member(_user_id uuid, _church_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.church_members WHERE user_id = _user_id AND church_id = _church_id
  );
$$;

-- ---------------------------------------------------------------------------
-- church_members: remove anonymous roster access; scope SELECT to the member
-- themselves, that church's admins, and platform staff. Nuru Faith has no church
-- "member directory" feature today (grep of src/ confirms every church_members
-- read is filtered to the caller's own user_id), so peer-to-peer visibility
-- inside the same church is intentionally left out until that product need exists.
-- ---------------------------------------------------------------------------
REVOKE SELECT ON public.church_members FROM anon;

DROP POLICY IF EXISTS "church members readable" ON public.church_members;
CREATE POLICY "church members readable" ON public.church_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR private.is_church_admin(auth.uid(), church_id)
  OR private.is_staff(auth.uid())
);

-- ---------------------------------------------------------------------------
-- groups: purely additive fix uncovered while testing the group_members change
-- below. "groups readable" never included `created_by = auth.uid()`, so a
-- private group's own creator could not see their own group row — which
-- silently defeated the "group creator can see the roster" case, since that
-- check joins back through this table. This only adds visibility; every
-- existing case (public groups, members, staff) is unchanged.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "groups readable" ON public.groups;
CREATE POLICY "groups readable" ON public.groups FOR SELECT
USING (
  privacy = 'public'
  OR created_by = auth.uid()
  OR private.is_group_member(auth.uid(), id)
  OR private.is_staff(auth.uid())
);

-- ---------------------------------------------------------------------------
-- group_members: same anonymous-access removal. Unlike churches, "who else is in
-- this group" is ordinary group functionality, so fellow members can see the
-- roster of a group they themselves belong to.
-- ---------------------------------------------------------------------------
REVOKE SELECT ON public.group_members FROM anon;

DROP POLICY IF EXISTS "group members readable" ON public.group_members;
CREATE POLICY "group members readable" ON public.group_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR private.is_group_member(auth.uid(), group_id)
  OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_id AND g.church_id IS NOT NULL AND private.is_church_admin(auth.uid(), g.church_id)
  )
  OR private.is_staff(auth.uid())
);

-- ---------------------------------------------------------------------------
-- reels: church_id can no longer be attached (or changed) unless the author
-- actually belongs to that church, or the request is coming from that church's
-- admin / platform staff. church_id IS NULL (a personal Reel) is unaffected.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "reels insert own or managed" ON public.reels;
CREATE POLICY "reels insert own or managed" ON public.reels FOR INSERT TO authenticated
WITH CHECK (
  private.is_staff(auth.uid())
  OR (church_id IS NOT NULL AND private.is_church_admin(auth.uid(), church_id))
  OR (
    author_id = auth.uid()
    AND (church_id IS NULL OR private.is_church_member(auth.uid(), church_id))
  )
);

DROP POLICY IF EXISTS "reels update own or managed" ON public.reels;
CREATE POLICY "reels update own or managed" ON public.reels FOR UPDATE TO authenticated
USING (
  author_id = auth.uid()
  OR private.is_staff(auth.uid())
  OR (church_id IS NOT NULL AND private.is_church_admin(auth.uid(), church_id))
)
WITH CHECK (
  private.is_staff(auth.uid())
  OR (church_id IS NOT NULL AND private.is_church_admin(auth.uid(), church_id))
  OR (
    author_id = auth.uid()
    AND (church_id IS NULL OR private.is_church_member(auth.uid(), church_id))
  )
);

COMMIT;
