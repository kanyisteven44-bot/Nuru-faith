-- Keep groups.member_count honest.
--
-- Two problems this fixes:
--  1. joinGroup()/leaveGroup() in src/services/content.ts write to group_members, but
--     nothing ever updated groups.member_count. Reels already have this pattern
--     (sync_reel_like_count, sync_reel_comment_count, sync_reel_view_count); groups
--     were simply missed.
--  2. The seeded counts were fabricated — groups advertised 12,400 / 8,900 / 6,100
--     members while group_members held zero rows. The community list sorts and
--     displays that number, so it was inflating social proof on every screen.

create or replace function public.sync_group_member_count()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'INSERT' then
    update public.groups set member_count = member_count + 1 where id = new.group_id;
  else
    update public.groups set member_count = greatest(member_count - 1, 0) where id = old.group_id;
  end if;
  return null;
end; $$;

drop trigger if exists trg_group_member_count on public.group_members;
create trigger trg_group_member_count
  after insert or delete on public.group_members
  for each row execute function public.sync_group_member_count();

-- Reconcile the stored counter with the rows that actually exist.
update public.groups g
set member_count = (select count(*) from public.group_members gm where gm.group_id = g.id)
where g.member_count <> (select count(*) from public.group_members gm where gm.group_id = g.id);
