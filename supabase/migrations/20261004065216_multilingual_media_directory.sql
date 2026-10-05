-- Add catalogue labels; existing approval, staff MFA and RLS policies remain unchanged.
alter table public.media_sources add column if not exists content_kind text not null default 'other' check (content_kind in ('music','podcast','mixed','other'));
alter table public.media_sources add column if not exists language_codes text[] not null default array['und'];
alter table public.media_items add column if not exists language_code text not null default 'und';
create index if not exists media_sources_directory_idx on public.media_sources(content_kind,name,id) where is_approved and source_type='youtube';
create index if not exists media_items_directory_idx on public.media_items(media_type,language_code,published_at desc,id) where is_approved;
update public.media_sources set content_kind='music',language_codes=case when name in ('Kambua','Mercy Masika') then array['sw','en'] when name in ('Joyous Celebration','Spirit Of Praise') then array['en','zu'] else array['en'] end where name in ('Hillsong Worship','Hillsong UNITED','Elevation Worship','Bethel Music','Maverick City Music','Joyous Celebration','Spirit Of Praise','Mercy Masika','Kambua','Brandon Lake','Phil Wickham','Gateway Worship','Worship Together','Sovereign Grace Music','for KING + COUNTRY','Lauren Daigle','DonMoenTV');
update public.media_sources set content_kind='podcast',language_codes=array['en'] where name in ('BibleProject','Elevation Church','Got Questions Ministries','Hillsong Church','Life.Church','Passion City Church','Saddleback Church','Spoken Gospel','The Bible Recap','The Gospel Coalition','WorshipU by Bethel Music');
update public.media_items set language_code='en' where media_type='music' and creator_name in ('Elevation Worship','Hillsong Worship','Bethel Music');
update public.media_items set language_code='sw' where media_type='music' and creator_name='Mercy Masika';
