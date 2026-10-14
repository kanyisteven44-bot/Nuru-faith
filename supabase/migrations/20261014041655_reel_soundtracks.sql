-- Optional licensed soundtrack selections for original member-uploaded reels.
-- Existing reels retain original video audio; no changes to roles or RLS.
alter table public.reels add column if not exists music_track_id text;
alter table public.reels add column if not exists music_start_seconds integer not null default 0;
alter table public.reels add constraint reels_music_start_range check (music_start_seconds between 0 and 600);
notify pgrst, 'reload schema';

-- Allow signed-in viewers to play only explicitly published public uploads.
-- The author must own the object folder, so publishing another person's
-- private storage path cannot turn that object into a public reel.
create policy "published original reel media readable" on storage.objects
for select to authenticated using (
  bucket_id = 'reel-media' and exists (
    select 1 from public.reels r
    where r.video_url = 'reel:' || storage.objects.name
      and r.author_id::text = (storage.foldername(storage.objects.name))[1]
      and r.status = 'published' and r.is_public and r.group_id is null
      and r.source_type = 'user_upload' and r.rights_status = 'owned'
  )
);
