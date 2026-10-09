-- Launch-readiness: index the referenced music item independently of
-- the composite (user_id, item_id) primary key. Removing or moderating a
-- media item must efficiently find members who saved it.
-- This change adds only an index: no user selections or media are modified.
create index if not exists profile_music_item_id_idx
  on public.profile_music (item_id);
