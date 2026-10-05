-- Require AAL2 for high-impact writes performed by Nuru staff accounts.
-- Non-staff users remain governed by the existing ownership/membership RLS policies.

create or replace function private.staff_session_is_aal2()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    case
      when (select auth.uid()) is null then false
      when private.is_staff((select auth.uid())) then coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
      else true
    end;
$$;

revoke all on function private.staff_session_is_aal2() from public, anon;
grant execute on function private.staff_session_is_aal2() to authenticated, service_role;

do $$
declare
  t text;
begin
  foreach t in array array['user_roles','churches','church_members','groups','group_members','events','mentors','reels','scripture_series','scripture_series_sessions','session_scriptures','media_categories','media_sources','media_items','media_item_categories','media_playlists','media_playlist_items','approved_youtube_channels','reports','reel_reports','external_reel_reports','serve_opportunities','courses']::text[]
  loop
    execute format('drop policy if exists "staff writes require aal2 insert" on public.%I', t);
    execute format(
      'create policy "staff writes require aal2 insert" on public.%I as restrictive for insert to authenticated with check (private.staff_session_is_aal2())',
      t
    );

    execute format('drop policy if exists "staff writes require aal2 update" on public.%I', t);
    execute format(
      'create policy "staff writes require aal2 update" on public.%I as restrictive for update to authenticated using (private.staff_session_is_aal2()) with check (private.staff_session_is_aal2())',
      t
    );

    execute format('drop policy if exists "staff writes require aal2 delete" on public.%I', t);
    execute format(
      'create policy "staff writes require aal2 delete" on public.%I as restrictive for delete to authenticated using (private.staff_session_is_aal2())',
      t
    );
  end loop;
end $$;
