-- RLS regression tests for
--   20261007120000_hide_prayer_request_authors.sql
--   20261007130000_close_group_call_and_post_spoofing.sql
--
-- Run against a scratch Postgres 16 database with the Supabase-style
-- auth/storage stub, roles and this repo's migrations applied:
--   psql -d <db> -v ON_ERROR_STOP=1 -f supabase/tests/rls_prayer_group_call_and_posts.sql
-- Everything runs in one transaction that is rolled back; any failed
-- assertion raises and exits nonzero.

\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'alice@example.test'),
  ('b2222222-2222-2222-2222-222222222222', 'bob@example.test');
INSERT INTO public.profiles (id, full_name) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Alice'),
  ('b2222222-2222-2222-2222-222222222222', 'Bob')
  ON CONFLICT (id) DO NOTHING;

-- Group 1 is Alice's, group 2 is Bob's private group. Both have an active call.
INSERT INTO public.groups (id, name, slug, privacy, created_by) VALUES
  ('91111111-1111-1111-1111-111111111111', 'Alice group', 'alice-group-test', 'private', 'a1111111-1111-1111-1111-111111111111'),
  ('92222222-2222-2222-2222-222222222222', 'Bob group', 'bob-group-test', 'private', 'b2222222-2222-2222-2222-222222222222');
INSERT INTO public.group_members (group_id, user_id) VALUES
  ('91111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111'),
  ('92222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222')
  ON CONFLICT DO NOTHING;
INSERT INTO public.group_call_rooms (id, group_id, created_by, kind, status) VALUES
  ('c1111111-1111-1111-1111-111111111111', '91111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'audio', 'active'),
  ('c2222222-2222-2222-2222-222222222222', '92222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'audio', 'active');

INSERT INTO public.prayer_requests (id, user_id, body, is_anonymous) VALUES
  ('d1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 'Pray for me', true);

CREATE OR REPLACE FUNCTION pg_temp.as_user(u uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
$$;

-- Runs `stmt` and raises unless it is rejected with insufficient_privilege or
-- an RLS violation (both surface as SQLSTATE 42501).
CREATE OR REPLACE FUNCTION pg_temp.expect_denied(label text, stmt text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN insufficient_privilege THEN
    RETURN;
  END;
  RAISE EXCEPTION 'TEST FAILED: % was allowed', label;
END $$;

-- ---------------------------------------------------------------- prayers
SET LOCAL ROLE anon;
SELECT pg_temp.expect_denied('anon reading prayer requests', 'SELECT id FROM public.prayer_requests');

SET LOCAL ROLE authenticated;
SELECT pg_temp.as_user('a1111111-1111-1111-1111-111111111111');
SELECT pg_temp.expect_denied('reading prayer authors', 'SELECT user_id FROM public.prayer_requests');
SELECT pg_temp.expect_denied('reading prayer authors via *', 'SELECT * FROM public.prayer_requests');

DO $$
BEGIN
  IF (SELECT count(*) FROM public.prayer_requests) <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: prayer bodies should stay readable';
  END IF;
  IF (SELECT is_mine FROM public.list_prayer_requests(30) WHERE body = 'Pray for me') THEN
    RAISE EXCEPTION 'TEST FAILED: Alice sees Bob''s prayer as hers';
  END IF;
END $$;

SELECT pg_temp.as_user('b2222222-2222-2222-2222-222222222222');
DO $$
BEGIN
  IF NOT (SELECT is_mine FROM public.list_prayer_requests(30) WHERE body = 'Pray for me') THEN
    RAISE EXCEPTION 'TEST FAILED: Bob cannot see his own prayer as his';
  END IF;
END $$;
-- Owners can still delete their own prayer (policy reads user_id internally).
DELETE FROM public.prayer_requests WHERE id = 'd1111111-1111-1111-1111-111111111111';
DO $$
BEGIN
  RESET ROLE;
  IF EXISTS (SELECT 1 FROM public.prayer_requests WHERE id = 'd1111111-1111-1111-1111-111111111111') THEN
    RAISE EXCEPTION 'TEST FAILED: Bob could not delete his own prayer';
  END IF;
END $$;

-- ------------------------------------------------------------- group calls
SET LOCAL ROLE authenticated;
SELECT pg_temp.as_user('a1111111-1111-1111-1111-111111111111');

-- Alice joins her own group's call, and the app's heartbeat upsert still works.
INSERT INTO public.group_call_participants (room_id, user_id, updated_at)
  VALUES ('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', now())
  ON CONFLICT (room_id, user_id) DO UPDATE
  SET room_id = excluded.room_id, user_id = excluded.user_id, updated_at = excluded.updated_at;
INSERT INTO public.group_call_participants (room_id, user_id, updated_at)
  VALUES ('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', now())
  ON CONFLICT (room_id, user_id) DO UPDATE
  SET room_id = excluded.room_id, user_id = excluded.user_id, updated_at = excluded.updated_at;

SELECT pg_temp.expect_denied('joining a private group call directly',
  $q$INSERT INTO public.group_call_participants (room_id, user_id)
     VALUES ('c2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111')$q$);

-- No WHERE clause on purpose: a filtered UPDATE is already stopped by the
-- SELECT policy, but an unfiltered one only meets the UPDATE policy.
SELECT pg_temp.expect_denied('moving a participant row into a private group call',
  $q$UPDATE public.group_call_participants
     SET room_id = 'c2222222-2222-2222-2222-222222222222'$q$);

SELECT pg_temp.expect_denied('rewriting a call room''s group',
  $q$UPDATE public.group_call_rooms
     SET group_id = '92222222-2222-2222-2222-222222222222'
     WHERE id = 'c1111111-1111-1111-1111-111111111111'$q$);

-- Ending your own group's call still works.
UPDATE public.group_call_rooms SET status = 'ended', ended_at = now()
  WHERE id = 'c1111111-1111-1111-1111-111111111111';

-- ------------------------------------------------------------------ posts
INSERT INTO public.posts (author_id, kind, body) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'text', 'Hello');
INSERT INTO public.posts (author_id, kind, body, group_id) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'text', 'Hello group', '91111111-1111-1111-1111-111111111111');

SELECT pg_temp.expect_denied('posting into a private group without membership',
  $q$INSERT INTO public.posts (author_id, kind, body, group_id)
     VALUES ('a1111111-1111-1111-1111-111111111111', 'text', 'spam', '92222222-2222-2222-2222-222222222222')$q$);

SELECT pg_temp.expect_denied('moving a post into a private group without membership',
  $q$UPDATE public.posts SET group_id = '92222222-2222-2222-2222-222222222222'
     WHERE author_id = 'a1111111-1111-1111-1111-111111111111'$q$);

SELECT pg_temp.expect_denied('posting under someone else''s name',
  $q$INSERT INTO public.posts (author_id, kind, body, author_name)
     VALUES ('a1111111-1111-1111-1111-111111111111', 'text', 'hi', 'Pastor Bob')$q$);

SELECT pg_temp.expect_denied('faking a post''s like count',
  $q$UPDATE public.posts SET like_count = 100000
     WHERE author_id = 'a1111111-1111-1111-1111-111111111111'$q$);

ROLLBACK;
\echo 'All prayer, group-call and post RLS tests passed'
