-- Reconcile the observed deployed admin-review RPC with the staff AAL2 policy.
-- Does not approve/reject existing media. QA must reconcile audit-table drift
-- and verify this migration on the project's PostgreSQL 17 schema before applying.
create or replace function public.nuru_admin_review(p_kind text, p_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare previous boolean; new_state boolean;
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_roles where user_id = auth.uid() and role::text = 'super_admin'
  ) then raise exception 'Access denied' using errcode = '42501'; end if;
  -- SECURITY DEFINER writes bypass table RLS; enforce assurance here as well.
  if coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' then
    raise exception 'Multi-factor authentication required' using errcode = '42501';
  end if;
  if p_kind is null or p_action is null or p_action not in ('approve','reject')
    or p_kind not in ('media_items','media_sources') then
    raise exception 'Invalid review action' using errcode = '22023';
  end if;
  new_state := p_action = 'approve';
  if p_kind = 'media_items' then
    select is_approved into previous from public.media_items where id = p_id for update;
    if not found then raise exception 'Media item not found'; end if;
    update public.media_items set is_approved = new_state where id = p_id;
  else
    select is_approved into previous from public.media_sources where id = p_id for update;
    if not found then raise exception 'Media source not found'; end if;
    update public.media_sources set is_approved = new_state where id = p_id;
  end if;
  insert into public.nuru_admin_audit_log(actor_id,target_table,target_id,action,previous_approval,new_approval)
    values(auth.uid(),p_kind,p_id,p_action,previous,new_state);
  return jsonb_build_object('success',true,'action',p_action,'id',p_id);
end $function$;
revoke all on function public.nuru_admin_review(text,uuid,text) from public, anon;
grant execute on function public.nuru_admin_review(text,uuid,text) to authenticated;
