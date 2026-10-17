import test from "node:test";
import assert from "node:assert/strict";
import { processCatalogPage } from "../src/lib/musicCatalogEngine.ts";
import { mapImportInputs } from "../src/lib/importConcurrency.ts";
const source = {
  id: "source",
  name: "Reviewed singer",
  channelId: "channel",
  languages: ["sw"],
  pageToken: "saved-page-2",
  playlistId: "uploads-cache",
};
const video = (id) => ({
  id,
  snippet: {
    title: "Worship song",
    channelId: "channel",
    channelTitle: "Singer",
    publishedAt: "2026-01-01T00:00:00Z",
    thumbnails: {},
  },
  status: { embeddable: true, privacyStatus: "public", uploadStatus: "processed" },
  contentDetails: { duration: "PT3M" },
});

test("resumes the saved page, reuses the playlist and skips known video detail requests", async () => {
  const calls = [];
  let inserted = [];
  const result = await processCatalogPage({
    kind: "music",
    source,
    call: async (path, params) => {
      calls.push([path, params]);
      if (path === "playlistItems")
        return {
          items: [
            { contentDetails: { videoId: "existing001" } },
            { contentDetails: { videoId: "newvideo001" } },
            { contentDetails: { videoId: "newvideo001" } },
          ],
          nextPageToken: "page-3",
        };
      return { items: [video("newvideo001")] };
    },
    existingIds: async () => new Set(["existing001"]),
    insert: async (rows) => {
      inserted = rows;
      return rows.length;
    },
  });
  assert.deepEqual(
    calls.map((x) => x[0]),
    ["playlistItems", "videos"],
  );
  assert.equal(calls[0][1].pageToken, "saved-page-2");
  assert.equal(calls[1][1].id, "newvideo001");
  assert.equal(inserted[0].language_code, "sw");
  assert.equal(result.nextPageToken, "page-3");
  assert.deepEqual(result.stats, {
    fetched: 2,
    parsed: 1,
    eligible: 1,
    inserted: 1,
    skippedExisting: 1,
    rejected: 0,
  });
});
test("already catalogued pages require no videos API call and no inserts", async () => {
  let calls = 0;
  const result = await processCatalogPage({
    kind: "music",
    source,
    call: async (path) => {
      assert.equal(path, "playlistItems");
      calls++;
      return { items: [{ contentDetails: { videoId: "existing001" } }] };
    },
    existingIds: async (ids) => new Set(ids),
    insert: async () => assert.fail("unnecessary insert"),
  });
  assert.equal(calls, 1);
  assert.equal(result.stats.skippedExisting, 1);
  assert.equal(result.nextPageToken, null);
});
test("incomplete, wrong-channel and blocked uploads are excluded without corrupting the page", async () => {
  const ids = ["missing0001", "blocked0001", "foreign0001", "goodvideo01"];
  const result = await processCatalogPage({
    kind: "music",
    source,
    call: async (path) =>
      path === "playlistItems"
        ? { items: ids.map((videoId) => ({ contentDetails: { videoId } })) }
        : {
            items: [
              { id: ids[0] },
              {
                ...video(ids[1]),
                contentDetails: { duration: "PT3M", regionRestriction: { blocked: ["KE"] } },
              },
              { ...video(ids[2]), snippet: { ...video(ids[2]).snippet, channelId: "foreign" } },
              video(ids[3]),
              video("unasked0001"),
            ],
          },
    existingIds: async () => new Set(),
    insert: async (rows) => {
      assert.deepEqual(
        rows.map((r) => r.external_id),
        [ids[3]],
      );
      return 1;
    },
  });
  assert.equal(result.stats.inserted, 1);
  assert.equal(result.stats.rejected, 3);
});
test("API/insert failures and repeated tokens reject instead of returning a new checkpoint", async () => {
  const base = {
    kind: "music",
    source,
    existingIds: async () => new Set(),
    insert: async () => {
      throw new Error("database down");
    },
  };
  await assert.rejects(
    () =>
      processCatalogPage({
        ...base,
        call: async () => {
          throw new Error("quota");
        },
      }),
    /quota/,
  );
  await assert.rejects(
    () =>
      processCatalogPage({
        ...base,
        call: async () => ({ items: [], nextPageToken: source.pageToken }),
      }),
    /repeated a page token/,
  );
  await assert.rejects(
    () =>
      processCatalogPage({
        ...base,
        call: async (path) =>
          path === "playlistItems"
            ? { items: [{ contentDetails: { videoId: "goodvideo01" } }] }
            : { items: [video("goodvideo01")] },
      }),
    /database down/,
  );
});
test("missing uploads playlist is retryable rather than permanently completing a creator", async () => {
  await assert.rejects(
    () =>
      processCatalogPage({
        kind: "music",
        source: { ...source, playlistId: null },
        call: async () => ({ items: [] }),
        existingIds: async () => new Set(),
        insert: async () => 0,
      }),
    /Progress was preserved/,
  );
});
test("bounded link resolution preserves order and partial failures", async () => {
  let active = 0,
    peak = 0;
  const results = await mapImportInputs(
    [1, 2, 3, 4, 5],
    async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      if (n === 3) throw new Error("bad link");
      return n * 2;
    },
    3,
  );
  assert.equal(peak, 3);
  assert.deepEqual(
    results.map((r) => r.status),
    ["fulfilled", "fulfilled", "rejected", "fulfilled", "fulfilled"],
  );
  assert.equal(results[4].value, 10);
});

test("already reviewed singers preserve their existing curation instead of being reapproved", async () => {
  const { reviewedSingerIds } = await import("../src/lib/singerImport.ts");
  const source = {
    youtube_channel_id: "a",
    is_approved: true,
    is_verified: true,
    content_kind: "mixed",
  };
  const trust = { channel_id: "a", is_verified: true, trust_level: "verified" };
  assert.deepEqual([...reviewedSingerIds([source], [trust])], ["a"]);
  assert.equal(reviewedSingerIds([{ ...source, is_approved: false }], [trust]).size, 0);
  assert.equal(reviewedSingerIds([source], [{ ...trust, is_verified: false }]).size, 0);
  assert.equal(reviewedSingerIds([{ ...source, content_kind: "podcast" }], [trust]).size, 0);
});
