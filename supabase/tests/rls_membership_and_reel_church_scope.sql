-- RLS regression tests for the 2026-09-15 security fix
-- (supabase/migrations/20260915140000_secure_membership_rosters_and_reel_church_scope.sql).
--
-- These exercise real Postgres row-level security by switching to the `anon`
-- and `authenticated` roles and setting `request.jwt.claims` the way
-- PostgREST/Supabase does per-request, then asserting on actual query results
-- (row counts, and whether a write is accepted or rejected) rather than
-- reading the policy source.
--
-- How to run against a scratch Postgres 16 database that already has the
-- Supabase-style `auth`/`storage` schemas, roles and this repo's migrations
-- applied (see the audit report for the one-time stub used to set that up
-- locally, since a bare `psql` has no Supabase project to point at):
--   psql -d <db> -v ON_ERROR_STOP=1 -f supabase/tests/rls_membership_and_reel_church_scope.sql
--
-- Every assertion is recorded as a row in a temp results table and printed at
-- the end; the script's own exit code is nonzero if any assertion failed.

\set ON_ERROR_STOP on

CREATE TEMP TABLE test_results (n serial PRIMARY KEY, name text, expected text, actual text, passed boolean);

-- ---------------------------------------------------------------------------
-- Fixtures (inserted as postgres, which bypasses RLS). Idempotent: clears any
-- leftover fixture rows from a previous run of this same script first.
-- ---------------------------------------------------------------------------
DELETE FROM public.reels WHERE creator_handle IN ('@bob','@alice');
DELETE FROM public.group_members WHERE group_id IN (SELECT id FROM public.groups WHERE slug IN ('group-g1-test','group-g2-test'));
DELETE FROM public.groups WHERE slug IN ('group-g1-test','group-g2-test');
DELETE FROM public.church_members WHERE church_id IN (SELECT id FROM public.churches WHERE slug IN ('church-a-test','church-b-test'));
DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@example.test');
DELETE FROM public.churches WHERE slug IN ('church-a-test','church-b-test');
DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email LIKE '%@example.test');
DELETE FROM auth.users WHERE email LIKE '%@example.test';

CREATE TEMP TABLE test_ids (key text PRIMARY KEY, id uuid NOT NULL DEFAULT gen_random_uuid());
INSERT INTO test_ids(key) VALUES
  ('alice'), ('bob'), ('carol'), ('dave'), ('erin'), ('frank'),
  ('church_a'), ('church_b'),
  ('group_g1'), ('group_g2');

GRANT SELECT ON test_ids TO anon, authenticated;
CREATE OR REPLACE FUNCTION pg_temp.tid(k text) RETURNS uuid LANGUAGE sql AS
  $$ SELECT id FROM test_ids WHERE key = k $$;

INSERT INTO auth.users (id, email) SELECT id, key || '@example.test' FROM test_ids
  WHERE key IN ('alice','bob','carol','dave','erin','frank');

-- handle_new_user() already inserted a profile + 'user' role per auth.users row above.
INSERT INTO public.profiles (id, full_name) SELECT id, key FROM test_ids
  WHERE key IN ('alice','bob','carol','dave','erin','frank')
  ON CONFLICT (id) DO NOTHING;

INSERT INTO public.churches (id, name, slug) VALUES
  (pg_temp.tid('church_a'), 'Church A', 'church-a-test'),
  (pg_temp.tid('church_b'), 'Church B', 'church-b-test');

-- alice + carol belong to Church A; bob belongs to Church B only.
INSERT INTO public.church_members (church_id, user_id) VALUES
  (pg_temp.tid('church_a'), pg_temp.tid('alice')),
  (pg_temp.tid('church_a'), pg_temp.tid('carol')),
  (pg_temp.tid('church_b'), pg_temp.tid('bob'));

-- carol is church_admin for Church A; dave is a platform moderator.
INSERT INTO public.user_roles (user_id, role, church_id) VALUES
  (pg_temp.tid('carol'), 'church_admin', pg_temp.tid('church_a')),
  (pg_temp.tid('dave'), 'moderator', NULL);

INSERT INTO public.groups (id, name, slug, privacy, church_id, created_by) VALUES
  (pg_temp.tid('group_g1'), 'Group G1', 'group-g1-test', 'private', pg_temp.tid('church_a'), pg_temp.tid('alice')),
  (pg_temp.tid('group_g2'), 'Group G2', 'group-g2-test', 'private', pg_temp.tid('church_b'), pg_temp.tid('frank'));

-- alice + erin belong to Group G1; nobody but frank (the creator) is attached to G2.
INSERT INTO public.group_members (group_id, user_id) VALUES
  (pg_temp.tid('group_g1'), pg_temp.tid('alice')),
  (pg_temp.tid('group_g1'), pg_temp.tid('erin'));

-- ---------------------------------------------------------------------------
-- Test helper: run one query/statement as a given role + JWT sub, recording
-- whether it succeeded and what it returned, without ever raising out of the
-- script (so one failing assertion doesn't stop the rest of the suite).
-- ---------------------------------------------------------------------------

-- Attack 1: anonymous user querying all church_members
DO $$
DECLARE cnt int;
BEGIN
  EXECUTE 'SET ROLE anon';
  BEGIN
    SELECT count(*) INTO cnt FROM public.church_members;
    EXECUTE 'RESET ROLE';
    INSERT INTO test_results(name, expected, actual, passed)
      VALUES ('ATTACK: anon selects all church_members', '0 rows visible', cnt || ' rows visible', cnt = 0);
  EXCEPTION WHEN insufficient_privilege THEN
    EXECUTE 'RESET ROLE';
    INSERT INTO test_results(name, expected, actual, passed)
      VALUES ('ATTACK: anon selects all church_members', '0 rows visible', 'permission denied (blocked)', true);
  END;
END $$;

-- Attack 2: anonymous user querying all group_members
DO $$
DECLARE cnt int;
BEGIN
  EXECUTE 'SET ROLE anon';
  BEGIN
    SELECT count(*) INTO cnt FROM public.group_members;
    EXECUTE 'RESET ROLE';
    INSERT INTO test_results(name, expected, actual, passed)
      VALUES ('ATTACK: anon selects all group_members', '0 rows visible', cnt || ' rows visible', cnt = 0);
  EXCEPTION WHEN insufficient_privilege THEN
    EXECUTE 'RESET ROLE';
    INSERT INTO test_results(name, expected, actual, passed)
      VALUES ('ATTACK: anon selects all group_members', '0 rows visible', 'permission denied (blocked)', true);
  END;
END $$;

-- Attack 3: authenticated user (bob) viewing an unrelated private group's roster (G1 — he is not a member, not staff, not G1's church admin, not its creator)
DO $$
DECLARE cnt int;
BEGIN
  EXECUTE 'SET ROLE authenticated';
  EXECUTE format('SET request.jwt.claims = %L', json_build_object('sub', pg_temp.tid('bob'), 'role', 'authenticated')::text);
  SELECT count(*) INTO cnt FROM public.group_members WHERE group_id = pg_temp.tid('group_g1');
  EXECUTE 'RESET ROLE';
  INSERT INTO test_results(name, expected, actual, passed)
    VALUES ('ATTACK: unrelated authenticated user reads group_g1 roster', '0 rows visible', cnt || ' rows visible', cnt = 0);
END $$;

-- Attack 4: authenticated user (bob, only a Church B member) attaches Church A's id to a new Reel
DO $$
BEGIN
  EXECUTE 'SET ROLE authenticated';
  EXECUTE format('SET request.jwt.claims = %L', json_build_object('sub', pg_temp.tid('bob'), 'role', 'authenticated')::text);
  BEGIN
    INSERT INTO public.reels (author_id, creator_name, creator_handle, church_id, status, is_public)
      VALUES (pg_temp.tid('bob'), 'bob', '@bob', pg_temp.tid('church_a'), 'published', true);
    EXECUTE 'RESET ROLE';
    INSERT INTO test_results(name, expected, actual, passed)
      VALUES ('ATTACK: insert Reel with unrelated church_id', 'insert rejected', 'insert SUCCEEDED (bug)', false);
  EXCEPTION WHEN insufficient_privilege THEN
    EXECUTE 'RESET ROLE';
    INSERT INTO test_results(name, expected, actual, passed)
      VALUES ('ATTACK: insert Reel with unrelated church_id', 'insert rejected', 'rejected by RLS (blocked)', true);
  END;
END $$;

-- Attack 5: authenticated user (alice) tries to move her OWN existing Reel to a church she is not a member of (Church B)
DO $$
DECLARE alice_reel_id uuid;
BEGIN
  EXECUTE 'SET ROLE authenticated';
  EXECUTE format('SET request.jwt.claims = %L', json_build_object('sub', pg_temp.tid('alice'), 'role', 'authenticated')::text);
  INSERT INTO public.reels (author_id, creator_name, creator_handle, church_id, status, is_public)
    VALUES (pg_temp.tid('alice'), 'alice', '@alice', pg_temp.tid('church_a'), 'published', true)
    RETURNING id INTO alice_reel_id;
  BEGIN
    UPDATE public.reels SET church_id = pg_temp.tid('church_b') WHERE id = alice_reel_id;
    EXECUTE 'RESET ROLE';
    INSERT INTO test_results(name, expected, actual, passed)
      VALUES ('ATTACK: retarget own Reel to unrelated church_id', 'update rejected', 'update SUCCEEDED (bug)', false);
  EXCEPTION WHEN insufficient_privilege THEN
    EXECUTE 'RESET ROLE';
    INSERT INTO test_results(name, expected, actual, passed)
      VALUES ('ATTACK: retarget own Reel to unrelated church_id', 'update rejected', 'rejected by RLS (blocked)', true);
  END;
END $$;

-- Legit 1: user reads their own church_members row
DO $$
DECLARE cnt int;
BEGIN
  EXECUTE 'SET ROLE authenticated';
  EXECUTE format('SET request.jwt.claims = %L', json_build_object('sub', pg_temp.tid('alice'), 'role', 'authenticated')::text);
  SELECT count(*) INTO cnt FROM public.church_members WHERE user_id = pg_temp.tid('alice');
  EXECUTE 'RESET ROLE';
  INSERT INTO test_results(name, expected, actual, passed)
    VALUES ('LEGIT: user reads own church_members row', '1 row', cnt || ' rows', cnt = 1);
END $$;

-- Legit 1b: user reads their own group_members row
DO $$
DECLARE cnt int;
BEGIN
  EXECUTE 'SET ROLE authenticated';
  EXECUTE format('SET request.jwt.claims = %L', json_build_object('sub', pg_temp.tid('alice'), 'role', 'authenticated')::text);
  SELECT count(*) INTO cnt FROM public.group_members WHERE user_id = pg_temp.tid('alice');
  EXECUTE 'RESET ROLE';
  INSERT INTO test_results(name, expected, actual, passed)
    VALUES ('LEGIT: user reads own group_members row', '1 row', cnt || ' rows', cnt = 1);
END $$;

-- Legit 2: a real Group G1 member (erin) can read the full G1 roster
DO $$
DECLARE cnt int;
BEGIN
  EXECUTE 'SET ROLE authenticated';
  EXECUTE format('SET request.jwt.claims = %L', json_build_object('sub', pg_temp.tid('erin'), 'role', 'authenticated')::text);
  SELECT count(*) INTO cnt FROM public.group_members WHERE group_id = pg_temp.tid('group_g1');
  EXECUTE 'RESET ROLE';
  INSERT INTO test_results(name, expected, actual, passed)
    VALUES ('LEGIT: fellow group member reads group_g1 roster', '2 rows', cnt || ' rows', cnt = 2);
END $$;

-- Legit 2b: a group's creator (frank) can read its roster even with zero memberships of his own
DO $$
DECLARE cnt int;
BEGIN
  INSERT INTO public.group_members (group_id, user_id) VALUES (pg_temp.tid('group_g2'), pg_temp.tid('bob'));
  EXECUTE 'SET ROLE authenticated';
  EXECUTE format('SET request.jwt.claims = %L', json_build_object('sub', pg_temp.tid('frank'), 'role', 'authenticated')::text);
  SELECT count(*) INTO cnt FROM public.group_members WHERE group_id = pg_temp.tid('group_g2');
  EXECUTE 'RESET ROLE';
  INSERT INTO test_results(name, expected, actual, passed)
    VALUES ('LEGIT: group creator reads its roster without being a member', '1 row', cnt || ' rows', cnt = 1);
END $$;

-- Legit 3: church admin (carol) reads the full Church A roster
DO $$
DECLARE cnt int;
BEGIN
  EXECUTE 'SET ROLE authenticated';
  EXECUTE format('SET request.jwt.claims = %L', json_build_object('sub', pg_temp.tid('carol'), 'role', 'authenticated')::text);
  SELECT count(*) INTO cnt FROM public.church_members WHERE church_id = pg_temp.tid('church_a');
  EXECUTE 'RESET ROLE';
  INSERT INTO test_results(name, expected, actual, passed)
    VALUES ('LEGIT: church admin reads full church_a roster', '2 rows', cnt || ' rows', cnt = 2);
END $$;

-- Legit 4: a genuine Church A member (alice) posts a Reel attributed to Church A
DO $$
DECLARE new_id uuid;
BEGIN
  EXECUTE 'SET ROLE authenticated';
  EXECUTE format('SET request.jwt.claims = %L', json_build_object('sub', pg_temp.tid('alice'), 'role', 'authenticated')::text);
  BEGIN
    INSERT INTO public.reels (author_id, creator_name, creator_handle, church_id, status, is_public)
      VALUES (pg_temp.tid('alice'), 'alice', '@alice', pg_temp.tid('church_a'), 'published', true) RETURNING id INTO new_id;
    EXECUTE 'RESET ROLE';
    INSERT INTO test_results(name, expected, actual, passed)
      VALUES ('LEGIT: church member posts a Reel for their own church', 'insert accepted', 'insert accepted', new_id IS NOT NULL);
  EXCEPTION WHEN insufficient_privilege THEN
    EXECUTE 'RESET ROLE';
    INSERT INTO test_results(name, expected, actual, passed)
      VALUES ('LEGIT: church member posts a Reel for their own church', 'insert accepted', 'insert REJECTED (bug)', false);
  END;
END $$;

-- Legit 5: any authenticated user creates a personal Reel with church_id = NULL
DO $$
DECLARE new_id uuid;
BEGIN
  EXECUTE 'SET ROLE authenticated';
  EXECUTE format('SET request.jwt.claims = %L', json_build_object('sub', pg_temp.tid('bob'), 'role', 'authenticated')::text);
  BEGIN
    INSERT INTO public.reels (author_id, creator_name, creator_handle, church_id, status, is_public)
      VALUES (pg_temp.tid('bob'), 'bob', '@bob', NULL, 'published', true) RETURNING id INTO new_id;
    EXECUTE 'RESET ROLE';
    INSERT INTO test_results(name, expected, actual, passed)
      VALUES ('LEGIT: user posts a personal Reel (church_id NULL)', 'insert accepted', 'insert accepted', new_id IS NOT NULL);
  EXCEPTION WHEN insufficient_privilege THEN
    EXECUTE 'RESET ROLE';
    INSERT INTO test_results(name, expected, actual, passed)
      VALUES ('LEGIT: user posts a personal Reel (church_id NULL)', 'insert accepted', 'insert REJECTED (bug)', false);
  END;
END $$;

-- Legit 6: a moderator (dave) retains full moderation reach — reads any church roster
-- and can post a Reel on behalf of another church/author (e.g. moving flagged content).
DO $$
DECLARE cnt int; new_id uuid;
BEGIN
  EXECUTE 'SET ROLE authenticated';
  EXECUTE format('SET request.jwt.claims = %L', json_build_object('sub', pg_temp.tid('dave'), 'role', 'authenticated')::text);
  SELECT count(*) INTO cnt FROM public.church_members;
  INSERT INTO public.reels (author_id, creator_name, creator_handle, church_id, status, is_public)
    VALUES (pg_temp.tid('alice'), 'alice', '@alice', pg_temp.tid('church_b'), 'published', true) RETURNING id INTO new_id;
  EXECUTE 'RESET ROLE';
  INSERT INTO test_results(name, expected, actual, passed)
    VALUES ('LEGIT: moderator reads all church_members rosters', '3 rows', cnt || ' rows', cnt = 3);
  INSERT INTO test_results(name, expected, actual, passed)
    VALUES ('LEGIT: moderator posts a Reel for another author/church (moderation)', 'insert accepted', 'insert accepted', new_id IS NOT NULL);
END $$;

-- ---------------------------------------------------------------------------
-- Report
-- ---------------------------------------------------------------------------
\echo '--- RLS regression test results ---'
SELECT n, name, expected, actual, passed FROM test_results ORDER BY n;

DO $$
DECLARE failures int;
BEGIN
  SELECT count(*) INTO failures FROM test_results WHERE NOT passed;
  IF failures > 0 THEN
    RAISE EXCEPTION '% test(s) FAILED', failures;
  END IF;
  RAISE NOTICE 'All % RLS regression tests passed', (SELECT count(*) FROM test_results);
END $$;
