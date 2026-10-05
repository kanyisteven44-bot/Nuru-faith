alter table public.posts add column if not exists music_track_id text check (music_track_id is null or length(music_track_id) <= 100);
alter table public.posts add column if not exists music_start_seconds integer not null default 0 check (music_start_seconds between 0 and 600);
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('post-media','post-media',false,52428800,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']) on conflict(id) do nothing;
create policy "post media read author or audience" on storage.objects for select to authenticated using (
 bucket_id='post-media' and (
 (storage.foldername(name))[1]=(select auth.uid())::text or exists (select 1 from public.posts p where p.media_url='post:'||name)
 )
);
do $$ begin
 if not exists(select 1 from pg_publication where pubname='supabase_realtime') then create publication supabase_realtime; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='call_sessions') then alter publication supabase_realtime add table public.call_sessions; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='direct_messages') then alter publication supabase_realtime add table public.direct_messages; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='group_chat_messages') then alter publication supabase_realtime add table public.group_chat_messages; end if;
end $$;
