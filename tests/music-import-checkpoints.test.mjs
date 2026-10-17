import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const migration = readFileSync(
  new URL(
    "../supabase/migrations/20261017085944_persistent_music_source_checkpoints.sql",
    import.meta.url,
  ),
  "utf8",
);
const a = "00000000-0000-0000-0000-000000000001",
  b = "00000000-0000-0000-0000-000000000002",
  c = "00000000-0000-0000-0000-000000000003";
const lease = "10000000-0000-0000-0000-000000000001";
async function fixture(legacy = false) {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create table public.media_sources(id uuid primary key,name text,youtube_channel_id text unique,language_codes text[],is_approved boolean,is_verified boolean,source_type text,content_kind text);
 create table public.approved_youtube_channels(channel_id text primary key,is_verified boolean,trust_level text);
 create table public.media_catalog_imports(kind text primary key,channel_id text,page_token text,status text,imported_total integer default 10,pages_processed integer default 0,last_error text,lease_token uuid,lease_until timestamptz,updated_at timestamptz default now());
 grant usage on schema public to service_role,anon,authenticated;
 grant all on public.media_sources,public.approved_youtube_channels,public.media_catalog_imports to service_role;
 insert into media_catalog_imports(kind,status,lease_token,lease_until)values('music','running','${lease}',now()+interval '90 seconds');
 insert into media_sources values('${a}','Singer A','channel-a','{sw}',true,true,'youtube','music'),('${b}','Singer B','channel-b','{en}',true,true,'youtube','music');
 insert into approved_youtube_channels values('channel-a',true,'trusted'),('channel-b',true,'verified');`);
  if (legacy)
    await db.exec(
      "update media_catalog_imports set channel_id='channel-a',page_token='legacy-page-2',status='paused'",
    );
  await db.exec(migration);
  return db;
}
async function next(db, ids = []) {
  return (await db.query("select next_media_catalog_source($1,$2) as value", ["music", ids]))
    .rows[0].value;
}
async function checkpoint(
  db,
  channel,
  expected,
  nextToken,
  stats = { fetched: 50, inserted: 5, skippedExisting: 40, rejected: 5 },
) {
  return db.query("select checkpoint_media_catalog_source($1,$2,$3,$4,$5,$6,$7,$8)", [
    "music",
    channel,
    lease,
    expected,
    nextToken,
    "uploads-" + channel,
    JSON.stringify(stats),
    100,
  ]);
}

test("saved pages survive source-filter changes; completed artists are not rescanned", async () => {
  const db = await fixture();
  try {
    await db.exec("set role service_role");
    assert.equal((await next(db)).channelId, "channel-a");
    await checkpoint(db, "channel-a", null, "page-2");
    assert.equal((await next(db)).pageToken, "page-2");
    assert.equal((await next(db, ["channel-b"])).channelId, "channel-b");
    await checkpoint(db, "channel-b", null, null);
    assert.equal(await next(db, ["channel-b"]), null);
    assert.equal((await next(db)).channelId, "channel-a");
    assert.equal((await next(db)).pageToken, "page-2");
    await checkpoint(db, "channel-a", "page-2", null);
    assert.equal(await next(db), null);
    await db.query("insert into media_sources values($1,$2,$3,$4,true,true,$5,$6)", [
      c,
      "New singer",
      "channel-c",
      ["en"],
      "youtube",
      "music",
    ]);
    await db.query("insert into approved_youtube_channels values('channel-c',true,'trusted')");
    assert.equal((await next(db)).channelId, "channel-c");
    const summary = (await db.query("select media_catalog_scan_summary('music') as value")).rows[0]
      .value;
    assert.equal(summary.sourceTotal, 3);
    assert.equal(summary.completedSources, 2);
    assert.equal(summary.pages, 3);
    assert.equal(summary.inserted, 15);
  } finally {
    await db.close();
  }
});
test("expired leases, duplicate pages and invalid stats cannot advance or inflate counters", async () => {
  const db = await fixture();
  try {
    await checkpoint(db, "channel-a", null, "page-2");
    await assert.rejects(() => checkpoint(db, "channel-a", null, "page-2"), /Checkpoint changed/);
    await assert.rejects(
      () => checkpoint(db, "channel-a", "page-2", "page-2"),
      /repeated a page token/,
    );
    await assert.rejects(() =>
      checkpoint(db, "channel-a", "page-2", "page-3", {
        fetched: -1,
        inserted: 0,
        skippedExisting: 0,
        rejected: 0,
      }),
    );
    await db.exec("update media_catalog_imports set lease_until=now()-interval '1 second'");
    await assert.rejects(() => checkpoint(db, "channel-a", "page-2", null), /lease expired/);
    const row = (
      await db.query("select * from media_catalog_source_progress where channel_id='channel-a'")
    ).rows[0];
    assert.equal(row.page_token, "page-2");
    assert.equal(row.pages_processed, 1);
    assert.equal(Number(row.inserted), 5);
    assert.equal(
      (await db.query("select imported_total from media_catalog_imports")).rows[0].imported_total,
      15,
    );
  } finally {
    await db.close();
  }
});
test("only explicit selected-source resets revisit history and retain cumulative measurements", async () => {
  const db = await fixture();
  try {
    await checkpoint(db, "channel-a", null, null);
    await assert.rejects(
      () => db.query("select reset_media_catalog_sources($1,$2,$3)", ["music", [], lease]),
      /Select specific creators/,
    );
    await db.query("select reset_media_catalog_sources($1,$2,$3)", ["music", ["channel-a"], lease]);
    assert.equal((await next(db, ["channel-a"])).pageToken, null);
    assert.equal(
      (
        await db.query(
          "select pages_processed from media_catalog_source_progress where channel_id='channel-a'",
        )
      ).rows[0].pages_processed,
      1,
    );
  } finally {
    await db.close();
  }
});
test("public and ordinary signed-in clients cannot invoke privileged checkpoint helpers or read progress", async () => {
  const db = await fixture();
  try {
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(() => next(db), /permission denied/);
      await assert.rejects(() => checkpoint(db, "channel-a", null, null), /permission denied/);
      await assert.rejects(
        () => db.query("select media_catalog_scan_summary('music')"),
        /permission denied/,
      );
      await assert.rejects(
        () => db.query("select * from media_catalog_source_progress"),
        /permission denied/,
      );
      await db.exec("reset role");
    }
  } finally {
    await db.close();
  }
});
test("legacy in-flight cursor is preserved without inventing completed history", async () => {
  const db = await fixture(true);
  try {
    assert.equal((await next(db)).channelId, "channel-a");
    assert.equal((await next(db)).pageToken, "legacy-page-2");
    assert.equal((await next(db, ["channel-b"])).pageToken, null);
    const rows = (await db.query("select * from media_catalog_source_progress")).rows;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].completed, false);
    assert.equal(rows[0].pages_processed, 0);
  } finally {
    await db.close();
  }
});

test("unapproved sources and unverified channels are excluded from selection and coverage", async () => {
  const db = await fixture();
  try {
    await db.exec(
      "update media_sources set is_approved=false where youtube_channel_id='channel-b'; update approved_youtube_channels set is_verified=false where channel_id='channel-a'; set role service_role",
    );
    assert.equal(await next(db), null);
    const summary = (await db.query("select media_catalog_scan_summary('music') as value")).rows[0]
      .value;
    assert.equal(summary.sourceTotal, 0);
  } finally {
    await db.close();
  }
});
