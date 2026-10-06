drop policy if exists "super admins manage roles insert" on public.user_roles;
drop policy if exists "super admins manage roles update" on public.user_roles;
drop policy if exists "super admins manage roles delete" on public.user_roles;

create policy "super admins manage roles insert"
on public.user_roles
for insert
to authenticated
with check (
  (select private.has_role((select auth.uid()), 'super_admin'::public.app_role))
  and (select coalesce(auth.jwt()->>'aal', 'aal1')) = 'aal2'
);

create policy "super admins manage roles update"
on public.user_roles
for update
to authenticated
using (
  (select private.has_role((select auth.uid()), 'super_admin'::public.app_role))
  and (select coalesce(auth.jwt()->>'aal', 'aal1')) = 'aal2'
)
with check (
  (select private.has_role((select auth.uid()), 'super_admin'::public.app_role))
  and (select coalesce(auth.jwt()->>'aal', 'aal1')) = 'aal2'
);

create policy "super admins manage roles delete"
on public.user_roles
for delete
to authenticated
using (
  (select private.has_role((select auth.uid()), 'super_admin'::public.app_role))
  and (select coalesce(auth.jwt()->>'aal', 'aal1')) = 'aal2'
);
