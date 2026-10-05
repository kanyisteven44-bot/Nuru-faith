-- The 35 seeded reels were entirely fabricated: every row had video_url = null (so
-- nothing could ever play) and invented "creators" (e.g. "Rev. Anne Wanjiku",
-- "Daniel Otieno") who do not exist. Remove them and replace with real content
-- through the same import path the app already builds for user-submitted links
-- (src/lib/reelImport.ts, src/components/nuru/CreateSheet.tsx): source_type,
-- external_id, external_url and poster_url set exactly as detectReelSource() would
-- derive them, rights_status = 'external_embed', video_url left null (Nuru Faith
-- never re-hosts). author_id is left null — this is curated/editorial content, not
-- authored by a Nuru user account, the same pattern already used for mentors.
--
-- Every video ID and Instagram shortcode below was confirmed to exist and to belong
-- to the named channel/account via live web search immediately before this
-- migration was written — none were guessed. YouTube channels match the trust
-- allowlist already seeded in 20260912170000 (approved_youtube_channels).

-- reels_source_type_check only allowed nuru_original/user_upload/church_upload/
-- creator_upload/youtube. src/lib/reelImport.ts, src/components/nuru/CreateSheet.tsx
-- and src/components/nuru/reels/ReelPane.tsx all already assume 'tiktok' and
-- 'instagram' are valid source_type values (CreateSheet tells the user "Recognized
-- as an Instagram link — it will play back through Instagram's own player" and lets
-- them submit). Without this, saving an Instagram or TikTok import fails the CHECK
-- constraint and the promised import silently never completes.
alter table public.reels drop constraint reels_source_type_check;
alter table public.reels add constraint reels_source_type_check
  check (source_type = any (array[
    'nuru_original', 'user_upload', 'church_upload', 'creator_upload',
    'youtube', 'tiktok', 'instagram'
  ]));

delete from public.reels where source_type = 'nuru_original' and rights_status = 'owned';

insert into public.reels
  (creator_name, creator_handle, caption, topic, scripture_ref, is_bible_teaching,
   source_type, rights_status, external_id, external_url, poster_url)
values
  ('BibleProject', '@bibleproject',
   'What is prayer? A short look at prayer and God''s sovereignty.',
   'Prayer', null, true,
   'youtube', 'external_embed', '26W3ngymiLQ',
   'https://www.youtube.com/watch?v=26W3ngymiLQ',
   'https://img.youtube.com/vi/26W3ngymiLQ/hqdefault.jpg'),

  ('BibleProject', '@bibleproject',
   'Can heaven happen here? A reflection on God''s kingdom breaking into the present.',
   'Faith', null, true,
   'youtube', 'external_embed', 'TQiK-8MLa2k',
   'https://www.youtube.com/watch?v=TQiK-8MLa2k',
   'https://img.youtube.com/vi/TQiK-8MLa2k/hqdefault.jpg'),

  ('Hillsong Worship', '@hillsongworship',
   'All Things Are Possible — a short of worship from Hillsong Worship.',
   'Worship', null, false,
   'youtube', 'external_embed', 'bHMpMJMtJd0',
   'https://www.youtube.com/watch?v=bHMpMJMtJd0',
   'https://img.youtube.com/vi/bHMpMJMtJd0/hqdefault.jpg'),

  ('Hillsong Worship', '@hillsongworship',
   'God''s Unending Love — worship from Hillsong Worship.',
   'Worship', null, false,
   'youtube', 'external_embed', '0ebbs77uc-E',
   'https://www.youtube.com/watch?v=0ebbs77uc-E',
   'https://img.youtube.com/vi/0ebbs77uc-E/hqdefault.jpg'),

  ('Elevation Worship', '@elevationworship',
   'I Trust In God — worship from Elevation Worship.',
   'Worship', null, false,
   'youtube', 'external_embed', 'U7UlETsbH_o',
   'https://www.youtube.com/watch?v=U7UlETsbH_o',
   'https://img.youtube.com/vi/U7UlETsbH_o/hqdefault.jpg'),

  ('Elevation Worship', '@elevationworship',
   'Worthy Of Glory Forever — worship from Elevation Worship.',
   'Worship', null, false,
   'youtube', 'external_embed', '3qukA2wsb28',
   'https://www.youtube.com/watch?v=3qukA2wsb28',
   'https://img.youtube.com/vi/3qukA2wsb28/hqdefault.jpg'),

  ('Bethel Music', '@bethelmusic',
   'The Blood — worship from Bethel Music.',
   'Worship', null, false,
   'youtube', 'external_embed', 'Rgmzhxc9poA',
   'https://www.youtube.com/watch?v=Rgmzhxc9poA',
   'https://img.youtube.com/vi/Rgmzhxc9poA/hqdefault.jpg'),

  ('Mercy Masika', '@Ambmercymasika',
   'Nivute — Swahili worship from Kenyan artist Mercy Masika.',
   'Worship', null, false,
   'youtube', 'external_embed', '-hdmrbPkKqI',
   'https://www.youtube.com/watch?v=-hdmrbPkKqI',
   'https://img.youtube.com/vi/-hdmrbPkKqI/hqdefault.jpg'),

  ('Bethel Music', '@bethelmusic',
   'A worship moment shared by Bethel Music on Instagram.',
   'Worship', null, false,
   'instagram', 'external_embed', 'DEc6I2CPiUA',
   'https://www.instagram.com/bethelmusic/reel/DEc6I2CPiUA/',
   null),

  ('Bethel Music', '@bethelmusic',
   'A worship moment shared by Bethel Music on Instagram.',
   'Worship', null, false,
   'instagram', 'external_embed', 'DBuOby5tl2R',
   'https://www.instagram.com/bethelmusic/reel/DBuOby5tl2R/',
   null);
