-- Creating a mentor does not grant staff access or mark the mentor verified.
create policy "super admins create unverified mentors"
on public.mentors
for insert to authenticated
with check (
  private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  and (select auth.jwt()->>'aal') = 'aal2'
  and verified = false
  and user_id is not null
  and exists (select 1 from public.profiles p where p.id = mentors.user_id)
);
