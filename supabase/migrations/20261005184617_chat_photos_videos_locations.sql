alter table public.direct_messages drop constraint direct_messages_message_type_check;
alter table public.direct_messages add constraint direct_messages_message_type_check check (message_type in ('text','voice','sticker','image','video','location'));
alter table public.group_chat_messages drop constraint group_chat_messages_message_type_check;
alter table public.group_chat_messages add constraint group_chat_messages_message_type_check check (message_type in ('text','voice','sticker','image','video','location'));
update storage.buckets set file_size_limit=52428800, allowed_mime_types=array['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/aac','audio/wav','image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']::text[] where id='chat-media';
