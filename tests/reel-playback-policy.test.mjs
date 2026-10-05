import test from "node:test";
import assert from "node:assert/strict";
import { reelPlaybackPolicy, isReelTap } from "../src/lib/reelPlaybackPolicy.ts";
import {
  readWatchedExternalReelIds,
  rememberWatchedExternalReel,
} from "../src/lib/reelWatchHistory.ts";
const active = {
  near: true,
  active: true,
  paused: false,
  commentsVisible: false,
  pageVisible: true,
  autoplayAllowed: true,
  manualStart: false,
};
test("data saver does not load or play until an explicit start", () => {
  assert.deepEqual(reelPlaybackPolicy({ ...active, autoplayAllowed: false }), {
    load: false,
    play: false,
  });
  assert.deepEqual(reelPlaybackPolicy({ ...active, autoplayAllowed: false, manualStart: true }), {
    load: true,
    play: true,
  });
});
test("offscreen, paused, hidden and comments states stop playback", () => {
  for (const change of [
    { near: false },
    { active: false },
    { paused: true },
    { pageVisible: false },
    { commentsVisible: true },
  ]) {
    assert.equal(reelPlaybackPolicy({ ...active, ...change }).play, false);
  }
  assert.equal(reelPlaybackPolicy(active).play, true);
});
test("vertical swipes and cancelled gestures are not video taps", () => {
  assert.equal(isReelTap({ x: 10, y: 10 }, { x: 12, y: 13 }), true);
  assert.equal(isReelTap({ x: 10, y: 10 }, { x: 10, y: 200 }), false);
  assert.equal(isReelTap({ x: 10, y: 10 }, { x: 40, y: 10 }), false);
  assert.equal(isReelTap(null, { x: 10, y: 10 }), false);
});
test("blocked browser storage does not break playback watch tracking", () => {
  const original = globalThis.window;
  globalThis.window = {
    get localStorage() {
      throw new Error("Storage disabled");
    },
  };
  try {
    assert.equal(readWatchedExternalReelIds("test-user").size, 0);
    assert.doesNotThrow(() => rememberWatchedExternalReel("test-user", "test-video"));
  } finally {
    if (original === undefined) delete globalThis.window;
    else globalThis.window = original;
  }
});
