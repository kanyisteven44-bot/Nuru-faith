import assert from "node:assert/strict";
import test from "node:test";
import { parseWatchedExternalReelIds } from "../src/lib/reelWatchHistory.ts";

test("restores unique watched external Reel ids from the legacy format", () => {
  assert.deepEqual(
    [...parseWatchedExternalReelIds('["video-a","video-b","video-a"]', "2026-09-17")],
    ["video-a", "video-b"],
  );
});

test("restores only today's daily watch history", () => {
  const today = JSON.stringify({ day: "2026-09-17", ids: ["video-a", "video-b", "video-a"] });
  const yesterday = JSON.stringify({ day: "2026-09-16", ids: ["video-old"] });

  assert.deepEqual(
    [...parseWatchedExternalReelIds(today, "2026-09-17")],
    ["video-a", "video-b"],
  );
  assert.deepEqual([...parseWatchedExternalReelIds(yesterday, "2026-09-17")], []);
});

test("fails closed for corrupt or unexpected watch history", () => {
  assert.deepEqual([...parseWatchedExternalReelIds("not-json", "2026-09-17")], []);
  assert.deepEqual([...parseWatchedExternalReelIds('{"video-a":true}', "2026-09-17")], []);
  assert.deepEqual(
    [...parseWatchedExternalReelIds('{"day":"2026-09-17","ids":["video-a",null,12,""]}', "2026-09-17")],
    ["video-a"],
  );
});
