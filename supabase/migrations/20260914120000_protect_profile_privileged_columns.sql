-- Close a privilege-escalation gap on profiles.
--
-- The "profiles update own" RLS policy is row-scoped (auth.uid() = id) but Postgres
-- RLS does not restrict which columns a matching UPDATE may touch. The app's own
-- updateProfile() in src/services/content.ts never sends `verified` or
-- `faith_streak`, but that is a client-side convention only — any authenticated user
-- can bypass the app entirely and PATCH their own row directly against PostgREST
-- (using their own JWT and the public publishable key) to set:
--   - verified = true   -> renders a cyan "verified" checkmark next to their name on
--                          every reel comment (src/components/nuru/reels/ReelComments.tsx),
--                          a trust/safety signal that should only ever be staff-granted
--   - faith_streak = 9999 -> fraudulently unlocks the "Kingdom Impact" journey stage
--
-- Fix: a BEFORE UPDATE trigger silently reverts these two columns to their previous
-- value unless the actor is staff (moderator/super_admin via private.is_staff) or the
-- request has no end-user JWT at all (service_role key, or a direct SQL/migration
-- context) — auth.uid() is NULL in both of those cases. This mirrors the existing
-- SECURITY DEFINER trigger pattern already used for reel/group counters, and matches
-- what the application has only ever intended to allow.

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is not null and not private.is_staff(auth.uid()) then
    new.verified := old.verified;
    new.faith_streak := old.faith_streak;
  end if;
  return new;
end; $$;

drop trigger if exists trg_protect_profile_privileged_columns on public.profiles;
create trigger trg_protect_profile_privileged_columns
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();
