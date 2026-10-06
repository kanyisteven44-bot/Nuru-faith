drop policy if exists "staff writes require aal2 insert" on public.user_roles;
drop policy if exists "staff writes require aal2 update" on public.user_roles;
drop policy if exists "staff writes require aal2 delete" on public.user_roles;

create policy "super admins manage roles insert"
on public.user_roles
for insert
to authenticated
with check (
  private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  and coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
);

create policy "super admins manage roles update"
on public.user_roles
for update
to authenticated
using (
  private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  and coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
)
with check (
  private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  and coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
);

create policy "super admins manage roles delete"
on public.user_roles
for delete
to authenticated
using (
  private.has_role((select auth.uid()), 'super_admin'::public.app_role)
  and coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
);
