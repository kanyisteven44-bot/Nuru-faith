-- Seed the YouTube trust allowlist.
--
-- Why this is needed: youtubeSearch() in src/lib/youtube.functions.ts filters every
-- result through approved_youtube_channels + media_sources and drops any channel whose
-- trust level is not official/verified/trusted. With both tables empty, every YouTube
-- rail on /music resolved to zero videos and rendered nothing at all.
--
-- trust_level must be set explicitly: the column default is 'discovery', which
-- trustedChannel() in src/lib/content-policy.ts rejects.

insert into public.approved_youtube_channels
  (channel_id, channel_name, category, denomination, country, is_verified, is_featured, trust_level, notes)
values
  -- Scripture teaching
  ('UCVfwlh9XpX2Y_tQfjeln9QA', 'BibleProject',              'teaching', null,          'US', true,  true,  'official', 'Animated books-of-the-Bible and biblical theme studies.'),
  ('UCIQqvZbHSwX0yKNVK1MyYjQ', 'Elevation Church',          'teaching', 'Non-denominational', 'US', true, false, 'verified', 'Weekly teaching from Elevation Church.'),
  ('UCSYGkbzVd5-EzAMEpf3EaGg', 'Hillsong Church',           'teaching', 'Pentecostal', 'AU', true,  false, 'verified', 'Services and teaching from Hillsong Church.'),

  -- Global worship
  ('UC4q12NoPNySbVqwpw4iO5Vg', 'Hillsong Worship',          'worship',  'Pentecostal', 'AU', true,  true,  'official', 'Congregational worship from Hillsong.'),
  ('UCsOoQeBWPnfWBYAwmO795zg', 'Hillsong UNITED',           'worship',  'Pentecostal', 'AU', true,  false, 'official', 'Hillsong UNITED worship.'),
  ('UCSf-NCzjwcnXErUBW_qeFvA', 'Elevation Worship',         'worship',  'Non-denominational', 'US', true, true, 'official', 'Worship from Elevation Church, Charlotte NC.'),
  ('UCbertc-gMbkkHuSmg0qwnxw', 'Bethel Music',              'worship',  'Non-denominational', 'US', true, true, 'official', 'Worship from Bethel Music, Redding CA.'),
  ('UCp7yiXtvaB3UmVMDEelFgWA', 'WorshipU by Bethel Music',  'worship',  'Non-denominational', 'US', true, false, 'trusted', 'Worship training and teaching.'),
  ('UCXttfHaCtBRik2vCKmz2D8w', 'Maverick City Music',       'worship',  'Non-denominational', 'US', true, false, 'verified', 'Worship collective out of Atlanta.'),

  -- African worship — the primary audience for Nuru Faith
  ('UCE8tXEgcltIcPvjFBWS5UXQ', 'Joyous Celebration',        'worship',  null,          'ZA', true,  true,  'official', 'South African gospel choir, active since 1994.'),
  ('UCp0dT8yDEAVe2LVjP9QFwjw', 'Spirit Of Praise',          'worship',  null,          'ZA', true,  false, 'official', 'South African praise and worship collective.'),
  ('UCn9mRGNo0CYj7nE6MepnWOQ', 'Mercy Masika',              'worship',  null,          'KE', true,  true,  'official', 'Kenyan worship leader and songwriter.'),
  ('UCw5d9msTsAVx7DIk6vaFrfQ', 'Kambua',                    'worship',  null,          'KE', true,  true,  'official', 'Kenyan gospel artist based in Nairobi.')
on conflict (channel_id) do update set
  channel_name = excluded.channel_name,
  category     = excluded.category,
  denomination = excluded.denomination,
  country      = excluded.country,
  is_verified  = excluded.is_verified,
  is_featured  = excluded.is_featured,
  trust_level  = excluded.trust_level,
  notes        = excluded.notes,
  updated_at   = now();

-- Mirror the same channels into media_sources so the Artists tab on /music has
-- something to list. media_sources has no unique key on youtube_channel_id, so guard
-- the insert instead of relying on ON CONFLICT.
insert into public.media_sources
  (name, source_type, youtube_channel_id, description, is_verified, is_approved)
select v.name, 'youtube', v.channel_id, v.description, true, true
from (values
  ('BibleProject',             'UCVfwlh9XpX2Y_tQfjeln9QA', 'Animated Bible studies that trace themes across Scripture.'),
  ('Hillsong Worship',         'UC4q12NoPNySbVqwpw4iO5Vg', 'Congregational worship written for the local church.'),
  ('Hillsong UNITED',          'UCsOoQeBWPnfWBYAwmO795zg', 'Worship from the Hillsong UNITED collective.'),
  ('Elevation Worship',        'UCSf-NCzjwcnXErUBW_qeFvA', 'Worship from Elevation Church, Charlotte NC.'),
  ('Bethel Music',             'UCbertc-gMbkkHuSmg0qwnxw', 'Worship from Bethel Music, Redding CA.'),
  ('Maverick City Music',      'UCXttfHaCtBRik2vCKmz2D8w', 'Worship collective out of Atlanta, Georgia.'),
  ('Joyous Celebration',       'UCE8tXEgcltIcPvjFBWS5UXQ', 'South African gospel choir singing in isiZulu, Sesotho and English.'),
  ('Spirit Of Praise',         'UCp0dT8yDEAVe2LVjP9QFwjw', 'South African praise and worship collective.'),
  ('Mercy Masika',             'UCn9mRGNo0CYj7nE6MepnWOQ', 'Kenyan worship leader and songwriter.'),
  ('Kambua',                   'UCw5d9msTsAVx7DIk6vaFrfQ', 'Kenyan gospel artist based in Nairobi.')
) as v(name, channel_id, description)
where not exists (
  select 1 from public.media_sources ms where ms.youtube_channel_id = v.channel_id
);
