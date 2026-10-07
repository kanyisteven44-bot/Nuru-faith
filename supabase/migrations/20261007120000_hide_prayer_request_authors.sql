-- Prayer requests must not reveal who wrote them. Previously the SELECT policy
-- was USING (true) for every role and both anon and authenticated could read
-- every column, so user_id (including on rows marked is_anonymous) was
-- readable straight from the REST API, even by signed-out visitors.
--
-- Readers now get only the non-identifying columns; the app learns which rows
-- are the caller's own through list_prayer_requests(), which compares user_id
-- server-side and never returns it.

revoke select on public.prayer_requests from anon, authenticated;
grant select (id, title, body, is_anonymous, prayer_count, created_at)
  on public.prayer_requests to authenticated;

drop policy if exists "prayers readable" on public.prayer_requests;
create policy "prayers readable" on public.prayer_requests
  for select to authenticated using (true);

create or replace function public.list_prayer_requests(p_limit integer default 30)
returns table(
  id uuid,
  title text,
  body text,
  is_anonymous boolean,
  created_at timestamptz,
  is_mine boolean
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    p.id,
    p.title,
    p.body,
    p.is_anonymous,
    p.created_at,
    (auth.uid() is not null and p.user_id = auth.uid()) as is_mine
  from public.prayer_requests p
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
$function$;

revoke all on function public.list_prayer_requests(integer) from public, anon;
grant execute on function public.list_prayer_requests(integer) to authenticated;
