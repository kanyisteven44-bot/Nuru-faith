-- Test-readiness hardening for admin metrics and call signaling.
-- Keeps staff reports callable through the signed-in user's JWT so the app does not
-- require a Vercel service-role secret for ordinary admin dashboards.

create index if not exists call_ice_candidates_user_id_idx
  on public.call_ice_candidates(user_id);

drop policy if exists "super admins create unverified mentors" on public.mentors;
create policy "super admins create unverified mentors"
on public.mentors
for insert
to authenticated
with check (
  (select private.has_role((select auth.uid()), 'super_admin'::public.app_role))
  and ((select auth.jwt() ->> 'aal') = 'aal2')
  and verified = false
  and user_id is not null
  and exists (select 1 from public.profiles p where p.id = mentors.user_id)
);

create or replace function private.get_nuru_pilot_metrics_internal()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
  uid uuid := auth.uid();
begin
  if uid is null or not (
    private.has_role(uid, 'super_admin'::public.app_role)
    or private.has_role(uid, 'moderator'::public.app_role)
  ) then
    raise exception 'staff access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'profiles', (select count(*) from public.profiles),
    'onboarded', (select count(*) from public.profiles where onboarded = true),
    'active_today', (select count(distinct user_id) from private.user_activity_daily where activity_date = current_date),
    'active_7d', (select count(distinct user_id) from private.user_activity_daily where activity_date >= current_date - 6),
    'active_30d', (select count(distinct user_id) from private.user_activity_daily where activity_date >= current_date - 29),
    'activated_users', (
      select count(distinct user_id)
      from (
        select user_id from public.reel_views
        union
        select follower_id as user_id from public.user_follows
        union
        select author_id as user_id from public.posts
        union
        select requester_id as user_id from public.mentorship_requests
      ) x
      where user_id is not null
    ),
    'reel_viewers', (select count(distinct user_id) from public.reel_views),
    'following_users', (select count(distinct follower_id) from public.user_follows),
    'post_authors', (select count(distinct author_id) from public.posts),
    'mentorship_requesters', (select count(distinct requester_id) from public.mentorship_requests),
    'push_enabled_users', (select count(distinct user_id) from public.web_push_subscriptions where enabled = true)
  ) into result;

  return result;
end
$$;

revoke all on function private.get_nuru_pilot_metrics_internal() from public, anon;
grant execute on function private.get_nuru_pilot_metrics_internal() to authenticated, service_role;

create or replace function public.get_nuru_pilot_metrics()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_nuru_pilot_metrics_internal();
$$;

revoke all on function public.get_nuru_pilot_metrics() from public, anon;
grant execute on function public.get_nuru_pilot_metrics() to authenticated, service_role;

create or replace function private.get_nuru_admin_overview_internal()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
  uid uuid := auth.uid();
begin
  if uid is null or not private.has_role(uid, 'super_admin'::public.app_role) then
    raise exception 'super-admin access required' using errcode = '42501';
  end if;

  with question_topics as (
    select user_id, case
      when content ~* '\m(pray|prayer|maombi)\M' then 'Prayer'
      when content ~* '\m(anxiety|anxious|fear|worry|stress)\M' then 'Worry and peace'
      when content ~* '\m(grief|grieving|loss|bereavement)\M' then 'Grief and comfort'
      when content ~* '\m(family|marriage|relationship|parent)\M' then 'Relationships and family'
      when content ~* '\m(work|job|career|money|finance)\M' then 'Work and stewardship'
      when content ~* '\m(bible|scripture|verse|jesus|god|faith)\M' then 'Scripture and faith'
      else 'Other learning questions' end as topic
    from public.ai_messages
    where role='user' and created_at >= now() - interval '30 days'
  ), topics as (
    select topic,count(*) as questions
    from question_topics
    group by topic
    having count(distinct user_id) >= 5
  )
  select jsonb_build_object(
    'people', (select count(*) from public.profiles),
    'churches', (select count(*) from public.churches),
    'churches_with_members', (select count(distinct church_id) from public.church_members),
    'memberships', (select count(*) from public.church_members),
    'mentors', (select count(*) from public.mentors),
    'verified_mentors', (select count(*) from public.mentors where verified),
    'ai_questions_30d', (select count(*) from question_topics),
    'ai_topics', coalesce((select jsonb_agg(jsonb_build_object('topic',topic,'questions',questions) order by questions desc) from topics), '[]'::jsonb),
    'church_members', coalesce((select jsonb_agg(jsonb_build_object('church_id',church_id,'members',members)) from (select church_id,count(*) as members from public.church_members group by church_id) counts), '[]'::jsonb)
  ) into result;

  return result;
end
$$;

revoke all on function private.get_nuru_admin_overview_internal() from public, anon;
grant execute on function private.get_nuru_admin_overview_internal() to authenticated, service_role;

create or replace function public.get_nuru_admin_overview()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_nuru_admin_overview_internal();
$$;

revoke all on function public.get_nuru_admin_overview() from public, anon;
grant execute on function public.get_nuru_admin_overview() to authenticated, service_role;
