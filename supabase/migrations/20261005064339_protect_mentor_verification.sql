-- A mentor may edit their biography, but cannot approve themselves or relink accounts.
create unique index mentors_registered_account_unique on public.mentors(user_id) where user_id is not null;
create function private.protect_mentor_verification()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if (new.verified is distinct from old.verified or new.user_id is distinct from old.user_id)
     and coalesce((select auth.role()), '') <> 'service_role'
     and not (private.has_role((select auth.uid()), 'super_admin'::public.app_role)
              and coalesce((select auth.jwt()->>'aal'), '') = 'aal2') then
    raise exception 'Only a verified super-admin session can approve or relink a mentor.' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_mentor_verification() from public,anon;
grant execute on function private.protect_mentor_verification() to authenticated,service_role;
create trigger protect_mentor_account_and_approval before update on public.mentors
for each row execute function private.protect_mentor_verification();
