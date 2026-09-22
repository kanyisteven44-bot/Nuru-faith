-- Remove redundant permissive SELECT-policy overlap while preserving access.

drop policy if exists "staff manage categories" on public.media_categories;
create policy "staff insert categories"
on public.media_categories for insert to authenticated
with check (private.is_staff((select auth.uid())));
create policy "staff update categories"
on public.media_categories for update to authenticated
using (private.is_staff((select auth.uid())))
with check (private.is_staff((select auth.uid())));
create policy "staff delete categories"
on public.media_categories for delete to authenticated
using (private.is_staff((select auth.uid())));

drop policy if exists "staff manage item categories" on public.media_item_categories;
create policy "staff insert item categories"
on public.media_item_categories for insert to authenticated
with check (private.is_staff((select auth.uid())));
create policy "staff update item categories"
on public.media_item_categories for update to authenticated
using (private.is_staff((select auth.uid())))
with check (private.is_staff((select auth.uid())));
create policy "staff delete item categories"
on public.media_item_categories for delete to authenticated
using (private.is_staff((select auth.uid())));

drop policy if exists "staff manage playlist items" on public.media_playlist_items;
create policy "staff insert playlist items"
on public.media_playlist_items for insert to authenticated
with check (private.is_staff((select auth.uid())));
create policy "staff update playlist items"
on public.media_playlist_items for update to authenticated
using (private.is_staff((select auth.uid())))
with check (private.is_staff((select auth.uid())));
create policy "staff delete playlist items"
on public.media_playlist_items for delete to authenticated
using (private.is_staff((select auth.uid())));

drop policy if exists "Reviewers manage sessions" on public.scripture_series_sessions;
create policy "Reviewers insert sessions"
on public.scripture_series_sessions for insert to authenticated
with check (
  private.has_role((select auth.uid()), 'super_admin'::app_role)
  or private.has_role((select auth.uid()), 'moderator'::app_role)
);
create policy "Reviewers update sessions"
on public.scripture_series_sessions for update to authenticated
using (
  private.has_role((select auth.uid()), 'super_admin'::app_role)
  or private.has_role((select auth.uid()), 'moderator'::app_role)
)
with check (
  private.has_role((select auth.uid()), 'super_admin'::app_role)
  or private.has_role((select auth.uid()), 'moderator'::app_role)
);
create policy "Reviewers delete sessions"
on public.scripture_series_sessions for delete to authenticated
using (
  private.has_role((select auth.uid()), 'super_admin'::app_role)
  or private.has_role((select auth.uid()), 'moderator'::app_role)
);

drop policy if exists "Reviewers manage session scriptures" on public.session_scriptures;
create policy "Reviewers insert session scriptures"
on public.session_scriptures for insert to authenticated
with check (
  private.has_role((select auth.uid()), 'super_admin'::app_role)
  or private.has_role((select auth.uid()), 'moderator'::app_role)
);
create policy "Reviewers update session scriptures"
on public.session_scriptures for update to authenticated
using (
  private.has_role((select auth.uid()), 'super_admin'::app_role)
  or private.has_role((select auth.uid()), 'moderator'::app_role)
)
with check (
  private.has_role((select auth.uid()), 'super_admin'::app_role)
  or private.has_role((select auth.uid()), 'moderator'::app_role)
);
create policy "Reviewers delete session scriptures"
on public.session_scriptures for delete to authenticated
using (
  private.has_role((select auth.uid()), 'super_admin'::app_role)
  or private.has_role((select auth.uid()), 'moderator'::app_role)
);
