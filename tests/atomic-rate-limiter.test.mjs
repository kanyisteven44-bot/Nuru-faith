import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql=readFileSync(new URL("../supabase/migrations/20261008220500_atomic_rate_limit_upsert.sql", import.meta.url),"utf8");
test("rate limit increments use atomic upsert instead of SELECT then INSERT race",()=>{
  assert.match(sql,/insert into private\.rate_limits/);
  assert.match(sql,/on conflict \(user_id, action\) do update/);
  assert.match(sql,/returning window_start, request_count into existing_start, next_count/);
  assert.doesNotMatch(sql,/for update/);
});
test("allowed actions, quotas, JWT-bound identity, and fail-closed behavior are preserved",()=>{
  assert.match(sql,/uid uuid := auth\.uid\(\)/);
  assert.match(sql,/if uid is null then raise exception 'authentication required'/);
  assert.match(sql,/when 'ai' then max_requests := 20; window_seconds := 600/);
  assert.match(sql,/when 'youtube_search' then max_requests := 30; window_seconds := 600/);
  assert.match(sql,/when 'discovery_search' then max_requests := 120; window_seconds := 600/);
  assert.match(sql,/else raise exception 'unsupported rate-limit action'/);
  assert.match(sql,/if next_count > max_requests then/);
  assert.match(sql,/raise exception 'RATE_LIMITED'/);
  assert.match(sql,/errcode = 'P0001'/);
  assert.match(sql,/set search_path = ''/);
  assert.doesNotMatch(sql,/security definer/i);
});
