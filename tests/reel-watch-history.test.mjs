import assert from "node:assert/strict";
import test from "node:test";
import { parseWatchedExternalReelIds } from "../src/lib/reelWatchHistory.ts";

test("restores unique watched external Reel ids", () => {
  assert.deepEqual(
    [...parseWatchedExternalReelIds('["video-a","video-b","video-a"]')],
    ["video-a", "video-b"],
  );
});

test("fails closed for corrupt or unexpected watch history", () => {
  assert.deepEqual([...parseWatchedExternalReelIds("not-json")], []);
  assert.deepEqual([...parseWatchedExternalReelIds('{"video-a":true}')], []);
  assert.deepEqual([...parseWatchedExternalReelIds('["video-a",null,12,""]')], ["video-a"]);
});
