import { test } from "node:test";
import assert from "node:assert/strict";
import { loadYoutubePlayerApi } from "../src/lib/youtubePlayerApi.ts";

test("a failed API load is retryable, concurrent players share one script, and readiness resolves the API", async () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const scripts = [];
  const timers = new Map();
  let timerId = 0;
  let previousCalled = 0;
  globalThis.window = {
    onYouTubeIframeAPIReady: () => previousCalled++,
    setTimeout: (fn) => {
      const id = ++timerId;
      timers.set(id, fn);
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  };
  globalThis.document = {
    createElement: () => ({
      remove() {
        this.removed = true;
      },
    }),
    head: { appendChild: (script) => scripts.push(script) },
  };
  try {
    const first = loadYoutubePlayerApi();
    assert.equal(loadYoutubePlayerApi(), first);
    assert.equal(scripts.length, 1);
    const failed = assert.rejects(first, /timed out/);
    [...timers.values()][0]();
    await failed;
    assert.equal(scripts[0].removed, true);
    assert.equal(timers.size, 0);

    const retried = loadYoutubePlayerApi();
    assert.notEqual(retried, first);
    assert.equal(loadYoutubePlayerApi(), retried);
    assert.equal(scripts.length, 2);
    const api = { Player: function Player() {} };
    window.YT = api;
    window.onYouTubeIframeAPIReady();
    assert.equal(await retried, api);
    assert.equal(await loadYoutubePlayerApi(), api);
    assert.equal(previousCalled, 1);
    assert.equal(timers.size, 0);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
