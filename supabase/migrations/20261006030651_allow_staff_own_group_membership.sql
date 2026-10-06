-- Own membership is personal; permissive policies still enforce group eligibility.
alter policy "staff writes require aal2 insert" on public.group_members
with check (user_id = (select auth.uid()) or private.staff_session_is_aal2());
alter policy "staff writes require aal2 delete" on public.group_members
using (user_id = (select auth.uid()) or private.staff_session_is_aal2());
