-- RLS regression tests for external_reel_likes / external_reel_saves / external_reel_comments
-- (supabase/migrations/20260916150000_add_external_reel_interactions.sql).
--
-- Run the same way as rls_membership_and_reel_church_scope.sql, against a
-- scratch Postgres 16 database with the Supabase-style auth/storage stub,
-- roles and this repo's migrations already applied:
--   psql -d <db> -v ON_ERROR_STOP=1 -f supabase/tests/rls_external_reel_interactions.sql

\set ON_ERROR_STOP on

BEGIN;

DELETE FROM auth.users WHERE email IN ('alice@example.test', 'bob@example.test');
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'alice@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.test');

CREATE OR REPLACE FUNCTION pg_temp.as_user(u uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
$$;

-- 1. Alice can like a reel as herself.
SET LOCAL ROLE authenticated;
SELECT pg_temp.as_user('11111111-1111-1111-1111-111111111111');
INSERT INTO public.external_reel_likes (external_reel_id, user_id) VALUES ('yt:abc', '11111111-1111-1111-1111-111111111111');

-- 2. Alice cannot like a reel on Bob's behalf.
DO $$
BEGIN
  BEGIN
    INSERT INTO public.external_reel_likes (external_reel_id, user_id)
      VALUES ('yt:abc', '22222222-2222-2222-2222-222222222222');
    RAISE EXCEPTION 'TEST FAILED: Alice inserted a like as Bob';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;

-- 3. Likes are publicly readable (matches the existing reel_likes convention).
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.external_reel_likes WHERE external_reel_id = 'yt:abc') <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: anon could not read likes';
  END IF;
END $$;

-- 4. Bob cannot delete Alice's like.
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT pg_temp.as_user('22222222-2222-2222-2222-222222222222');
DELETE FROM public.external_reel_likes WHERE external_reel_id = 'yt:abc' AND user_id = '11111111-1111-1111-1111-111111111111';
DO $$
BEGIN
  IF (SELECT count(*) FROM public.external_reel_likes WHERE external_reel_id = 'yt:abc') <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: Bob deleted Alice''s like';
  END IF;
END $$;

-- 5. Alice can delete her own like.
SELECT pg_temp.as_user('11111111-1111-1111-1111-111111111111');
DELETE FROM public.external_reel_likes WHERE external_reel_id = 'yt:abc' AND user_id = '11111111-1111-1111-1111-111111111111';
DO $$
BEGIN
  IF (SELECT count(*) FROM public.external_reel_likes) <> 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Alice could not delete her own like';
  END IF;
END $$;

-- 6. Saves are private: Alice saves a reel, Bob cannot see or remove it.
INSERT INTO public.external_reel_saves (external_reel_id, user_id) VALUES ('yt:abc', '11111111-1111-1111-1111-111111111111');

SELECT pg_temp.as_user('22222222-2222-2222-2222-222222222222');
DO $$
BEGIN
  IF (SELECT count(*) FROM public.external_reel_saves WHERE user_id = '11111111-1111-1111-1111-111111111111') <> 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Bob could read Alice''s save';
  END IF;
END $$;
DELETE FROM public.external_reel_saves WHERE user_id = '11111111-1111-1111-1111-111111111111';

SELECT pg_temp.as_user('11111111-1111-1111-1111-111111111111');
DO $$
BEGIN
  IF (SELECT count(*) FROM public.external_reel_saves) <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: Bob deleted Alice''s save despite RLS';
  END IF;
END $$;

-- 7. Anyone can insert their own comment; comments are publicly readable.
SELECT pg_temp.as_user('22222222-2222-2222-2222-222222222222');
INSERT INTO public.external_reel_comments (external_reel_id, user_id, content) VALUES ('yt:abc', '22222222-2222-2222-2222-222222222222', 'Amen!');

RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.external_reel_comments WHERE external_reel_id = 'yt:abc') <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: anon could not read comments';
  END IF;
END $$;

-- 8. Alice cannot delete Bob's comment (not staff).
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT pg_temp.as_user('11111111-1111-1111-1111-111111111111');
DELETE FROM public.external_reel_comments WHERE external_reel_id = 'yt:abc';
DO $$
BEGIN
  IF (SELECT count(*) FROM public.external_reel_comments WHERE external_reel_id = 'yt:abc') <> 1 THEN
    RAISE EXCEPTION 'TEST FAILED: Alice deleted Bob''s comment without being staff';
  END IF;
END $$;

-- 9. Bob can delete his own comment.
SELECT pg_temp.as_user('22222222-2222-2222-2222-222222222222');
DELETE FROM public.external_reel_comments WHERE external_reel_id = 'yt:abc' AND user_id = '22222222-2222-2222-2222-222222222222';
DO $$
BEGIN
  IF (SELECT count(*) FROM public.external_reel_comments) <> 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Bob could not delete his own comment';
  END IF;
END $$;

-- 10. Comment content length constraint is enforced (1-800 chars).
SELECT pg_temp.as_user('11111111-1111-1111-1111-111111111111');
DO $$
BEGIN
  BEGIN
    INSERT INTO public.external_reel_comments (external_reel_id, user_id, content) VALUES ('yt:abc', '11111111-1111-1111-1111-111111111111', '');
    RAISE EXCEPTION 'TEST FAILED: empty comment content was accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END $$;

RESET ROLE;
SELECT 'ALL EXTERNAL REEL INTERACTION RLS TESTS PASSED' AS result;

ROLLBACK;
