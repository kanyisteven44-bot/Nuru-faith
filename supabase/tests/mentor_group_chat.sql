-- Run via execute_sql / psql. All fixtures and test messages are rolled back.
begin;
insert into auth.users(id,email,aud,role,raw_user_meta_data) values
 ('a1100000-0000-4000-8000-000000000001','nuru-chat-member@example.invalid','authenticated','authenticated','{}'),
 ('a1100000-0000-4000-8000-000000000002','nuru-chat-mentor@example.invalid','authenticated','authenticated','{}'),
 ('a1100000-0000-4000-8000-000000000003','nuru-chat-outsider@example.invalid','authenticated','authenticated','{}');
insert into public.profiles(id,full_name) values
 ('a1100000-0000-4000-8000-000000000001','Chat test member'),
 ('a1100000-0000-4000-8000-000000000002','Chat test mentor'),
 ('a1100000-0000-4000-8000-000000000003','Chat test outsider') on conflict(id) do nothing;
insert into public.mentors(id,user_id,display_name) values ('a2200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','Chat test mentor');
insert into public.groups(id,name,slug,created_by) values ('a3300000-0000-4000-8000-000000000001','Chat test group','nuru-chat-rollback-test','a1100000-0000-4000-8000-000000000001');
insert into public.group_members(group_id,user_id) values ('a3300000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1100000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
do $$ declare created uuid; begin
 created := public.create_chat_group('Atomic test group','Rollback only');
 if not exists(select 1 from public.group_members where group_id=created and user_id=auth.uid()) then raise exception 'Creator membership missing'; end if;
 insert into public.group_chat_messages(group_id,sender_id,body) values(created,auth.uid(),'Atomic creator hello');
end $$;
insert into public.mentor_chat_messages(mentor_id,requester_id,sender_id,body) values ('a2200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','Test hello');
insert into public.group_chat_messages(group_id,sender_id,body) values ('a3300000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','Test group hello');
do $$ begin
 if (select count(*) from public.mentor_chat_threads where mentor_id='a2200000-0000-4000-8000-000000000001')<>1 then raise exception 'Member inbox failed'; end if;
 if (select count(*) from public.group_chat_messages where group_id='a3300000-0000-4000-8000-000000000001')<>1 then raise exception 'Member group read failed'; end if;
 begin
  insert into public.group_chat_messages(group_id,sender_id,body) values ('a3300000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','Spoofed');
  raise exception 'Sender spoof allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.group_chat_messages(group_id,sender_id,body,created_at) values ('a3300000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','Timestamp spoof',now());
  raise exception 'Client timestamp allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.group_chat_messages(group_id,sender_id,body) values ('a3300000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','  ');
  raise exception 'Empty message allowed';
 exception when check_violation then null; end;
 begin
  update public.mentor_chat_messages set body='Edited'; raise exception 'Message edits allowed';
 exception when insufficient_privilege then null; end;
 begin
  delete from public.group_chat_messages; raise exception 'Message deletes allowed';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"a1100000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
do $$ begin
 if (select count(*) from public.mentor_chat_messages where mentor_id='a2200000-0000-4000-8000-000000000001')<>1 then raise exception 'Mentor read failed'; end if;
end $$;
insert into public.mentor_chat_messages(mentor_id,requester_id,sender_id,body) values ('a2200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000002','Test mentor reply');
select set_config('request.jwt.claims','{"sub":"a1100000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal1"}',true);
do $$ begin
 if exists(select 1 from public.mentor_chat_messages where mentor_id='a2200000-0000-4000-8000-000000000001') then raise exception 'Outsider mentor read allowed'; end if;
 if exists(select 1 from public.mentor_chat_threads where mentor_id='a2200000-0000-4000-8000-000000000001') then raise exception 'Inbox view leaked'; end if;
 if exists(select 1 from public.group_chat_messages where group_id='a3300000-0000-4000-8000-000000000001') then raise exception 'Nonmember group read allowed'; end if;
 begin
  insert into public.mentor_chat_messages(mentor_id,requester_id,sender_id,body) values ('a2200000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000003','Intrusion');
  raise exception 'Outsider mentor send allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.group_chat_messages(group_id,sender_id,body) values ('a3300000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000003','Intrusion');
  raise exception 'Nonmember group send allowed';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"a1100000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);
delete from public.group_members where group_id='a3300000-0000-4000-8000-000000000001' and user_id='a1100000-0000-4000-8000-000000000001';
do $$ begin
 if exists(select 1 from public.group_chat_messages where group_id='a3300000-0000-4000-8000-000000000001') then raise exception 'Former member read allowed'; end if;
 begin
  insert into public.group_chat_messages(group_id,sender_id,body) values ('a3300000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','After leaving');
  raise exception 'Former member send allowed';
 exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
 begin perform 1 from public.group_chat_messages; raise exception 'Anonymous read allowed'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.mentor_chat_messages; raise exception 'Anonymous mentor read allowed'; exception when insufficient_privilege then null; end;
end $$;
rollback;
