import assert from "node:assert/strict";
import test from "node:test";
import { parseWatchedExternalReelIds } from "../src/lib/reelWatchHistory.ts";

test("restores unique watched external Reel ids from the legacy array format", () => {
  assert.deepEqual(
    [...parseWatchedExternalReelIds('["video-a","video-b","video-a"]', "2026-09-17")],
    ["video-a", "video-b"],
  );
});

test("migrates old daily watch history into all-time watch history", () => {
  const today = JSON.stringify({ day: "2026-09-17", ids: ["video-a", "video-b", "video-a"] });
  const yesterday = JSON.stringify({ day: "2026-09-16", ids: ["video-old"] });

  assert.deepEqual([...parseWatchedExternalReelIds(today, "2026-09-17")], ["video-a", "video-b"]);
  assert.deepEqual([...parseWatchedExternalReelIds(yesterday, "2026-09-17")], ["video-old"]);
});

test("restores the new all-time watch history format", () => {
  const value = JSON.stringify({ ids: ["video-a", "video-b", "video-a"] });
  assert.deepEqual([...parseWatchedExternalReelIds(value, "2026-10-07")], ["video-a", "video-b"]);
});

test("fails closed for corrupt or unexpected watch history", () => {
  assert.deepEqual([...parseWatchedExternalReelIds("not-json", "2026-09-17")], []);
  assert.deepEqual([...parseWatchedExternalReelIds('{"video-a":true}', "2026-09-17")], []);
  assert.deepEqual(
    [
      ...parseWatchedExternalReelIds(
        '{"day":"2026-09-17","ids":["video-a",null,12,""]}',
        "2026-09-17",
      ),
    ],
    ["video-a"],
  );
});
