alter table public.posts add constraint posts_media_owned_folder check (media_url is null or media_url not like 'post:%' or media_url like 'post:'||author_id::text||'/%');
