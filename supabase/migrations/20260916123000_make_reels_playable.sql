-- Make the initial Reels feed playable.
-- Hide demo placeholders that have no media source, then seed approved YouTube embeds.

update public.reels
set is_public = false, updated_at = now()
where status = 'published'
  and is_public = true
  and video_url is null
  and external_id is null;

insert into public.reels
  (creator_name, creator_handle, caption, poster_url, audio_title, topic,
   status, is_public, is_bible_teaching, source_type, rights_status, external_id, external_url, title)
select
  v.creator_name, v.creator_handle, v.caption, v.poster_url, 'YouTube', v.topic,
  'published', true, false, 'youtube', 'external_embed', v.external_id, v.external_url, v.title
from (values
  ('Mercy Masika', '@mercymasika', 'God has been faithful — a worship moment from Mercy Masika.', 'https://i.ytimg.com/vi/WzPtkplaPec/hqdefault.jpg', 'worship', 'WzPtkplaPec', 'https://www.youtube.com/watch?v=WzPtkplaPec', 'God Has Been Faithful'),
  ('Mercy Masika', '@mercymasika', 'Wonderful — worship with Mercy Masika.', 'https://i.ytimg.com/vi/3By1DaJww9Y/hqdefault.jpg', 'worship', '3By1DaJww9Y', 'https://www.youtube.com/watch?v=3By1DaJww9Y', 'Wonderful')
) as v(creator_name, creator_handle, caption, poster_url, topic, external_id, external_url, title)
where not exists (
  select 1 from public.reels r
  where r.source_type = 'youtube' and r.external_id = v.external_id
);
