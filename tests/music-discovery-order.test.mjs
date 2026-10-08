import test from "node:test";
import assert from "node:assert/strict";
import { rotateMusicPage, nextMusicRefresh } from "../src/lib/musicDiscoveryOrder.ts";

test("every refresh changes all song positions while preserving every song", () => {
  const songs = Array.from({ length: 48 }, (_, i) => ({ id: `song-${i}` }));
  const before = rotateMusicPage(songs, 12);
  const after = rotateMusicPage(songs, 13);
  assert.ok(before.every((song, i) => song.id !== after[i].id));
  assert.deepEqual(after.map((s) => s.id).sort(), songs.map((s) => s.id).sort());
  assert.equal(songs[0].id, "song-0");
  assert.deepEqual(rotateMusicPage(songs, 12), before);
});

test("loading more keeps the previous page stable and handles small catalogues", () => {
  const first = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const more = [{ id: "d" }, { id: "e" }];
  const displayed = [...rotateMusicPage(first, 7), ...rotateMusicPage(more, 7)];
  assert.deepEqual(displayed.slice(0, 3), rotateMusicPage(first, 7));
  assert.deepEqual(rotateMusicPage([], 7), []);
  assert.deepEqual(rotateMusicPage([{ id: "only" }], 7), [{ id: "only" }]);
});

test("reload advances the ordering counter and unavailable storage is tolerated", () => {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  assert.equal(nextMusicRefresh(storage), 1);
  assert.equal(nextMusicRefresh(storage), 2);
  values.set("nuru:music-order:v1", "broken");
  assert.equal(nextMusicRefresh(storage), 1);
  assert.ok(
    Number.isFinite(
      nextMusicRefresh({
        getItem() {
          throw Error("blocked");
        },
        setItem() {},
      }),
    ),
  );
});
