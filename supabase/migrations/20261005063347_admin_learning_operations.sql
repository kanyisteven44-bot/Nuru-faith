-- Keep the existing restrictive AAL2 policies on all staff writes.
create policy "mentors super insert" on public.mentors for insert to authenticated
with check (private.has_role((select auth.uid()), 'super_admin'::public.app_role));
create policy "mentors super update" on public.mentors for update to authenticated
using (private.has_role((select auth.uid()), 'super_admin'::public.app_role))
with check (private.has_role((select auth.uid()), 'super_admin'::public.app_role));
create policy "churches super update" on public.churches for update to authenticated
using (private.has_role((select auth.uid()), 'super_admin'::public.app_role))
with check (private.has_role((select auth.uid()), 'super_admin'::public.app_role));

-- Only the authenticated, role-checked server endpoint may request this report.
-- No prompts, answers, user IDs or conversation IDs are returned.
create function public.get_nuru_admin_overview()
returns jsonb language sql stable security invoker set search_path = '' as $$
with question_topics as (
  select user_id, case
    when content ~* '\m(pray|prayer|maombi)\M' then 'Prayer'
    when content ~* '\m(anxiety|anxious|fear|worry|stress)\M' then 'Worry and peace'
    when content ~* '\m(grief|grieving|loss|bereavement)\M' then 'Grief and comfort'
    when content ~* '\m(family|marriage|relationship|parent)\M' then 'Relationships and family'
    when content ~* '\m(work|job|career|money|finance)\M' then 'Work and stewardship'
    when content ~* '\m(bible|scripture|verse|jesus|god|faith)\M' then 'Scripture and faith'
    else 'Other learning questions' end as topic
  from public.ai_messages where role='user' and created_at >= now() - interval '30 days'
), topics as (
  select topic,count(*) as questions from question_topics group by topic
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
);
$$;
revoke all on function public.get_nuru_admin_overview() from public,anon,authenticated;
grant execute on function public.get_nuru_admin_overview() to service_role;
