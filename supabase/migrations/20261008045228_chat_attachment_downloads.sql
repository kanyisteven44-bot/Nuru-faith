alter table public.direct_messages drop constraint if exists direct_messages_message_type_check;
alter table public.direct_messages add constraint direct_messages_message_type_check check (message_type in ('text','voice','sticker','image','video','file','location'));
alter table public.group_chat_messages drop constraint if exists group_chat_messages_message_type_check;
alter table public.group_chat_messages add constraint group_chat_messages_message_type_check check (message_type in ('text','voice','sticker','image','video','file','location'));
update storage.buckets set allowed_mime_types = array(select distinct unnest(coalesce(allowed_mime_types, '{}'::text[]) || array['application/pdf','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/zip']::text[])) where id='chat-media';
