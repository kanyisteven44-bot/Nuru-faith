-- Atomic creation and membership, using the caller's existing RLS policies.
create function public.create_chat_group(group_name text, group_description text default '')
returns uuid language plpgsql security invoker set search_path='' as $$
declare new_id uuid := gen_random_uuid(); caller uuid := auth.uid();
begin
 if caller is null then raise exception 'Sign in to create a group' using errcode='42501'; end if;
 if length(btrim(group_name)) not between 2 and 80 or length(coalesce(group_description,''))>400 then
  raise exception 'Group name must be 2–80 characters and description at most 400' using errcode='22023';
 end if;
 insert into public.groups(id,name,slug,description,privacy,created_by)
 values(new_id,btrim(group_name),'group-'||new_id::text,btrim(coalesce(group_description,'')),'public',caller);
 insert into public.group_members(group_id,user_id) values(new_id,caller);
 return new_id;
end $$;
revoke all on function public.create_chat_group(text,text) from public, anon;
grant execute on function public.create_chat_group(text,text) to authenticated;
