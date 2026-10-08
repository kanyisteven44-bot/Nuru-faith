import test from "node:test";
import assert from "node:assert/strict";
import {
  validateChatWallpaper,
  loadChatWallpaper,
  saveChatWallpaper,
} from "../src/lib/chatWallpaperStorage.ts";

test("custom wallpaper accepts photos and rejects executable SVG, empty and oversized inputs", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif"])
    assert.doesNotThrow(() => validateChatWallpaper({ type, size: 1024 }));
  for (const file of [
    { type: "image/svg+xml", size: 100 },
    { type: "image/jpeg", size: 0 },
    { type: "image/png", size: 11 * 1024 * 1024 },
  ])
    assert.throws(() => validateChatWallpaper(file));
});

test("custom photos survive storage reload and remain isolated per chat", async () => {
  const previous = globalThis.indexedDB;
  const records = new Map();
  let closed = 0;
  globalThis.indexedDB = {
    open() {
      const request = {};
      queueMicrotask(() => {
        request.result = {
          close() {
            closed++;
          },
          transaction() {
            const tx = {};
            tx.objectStore = () => ({
              put(value, key) {
                records.set(key, value);
                queueMicrotask(() => tx.oncomplete());
              },
              get(key) {
                const result = { result: records.get(key) };
                queueMicrotask(() => tx.oncomplete());
                return result;
              },
            });
            return tx;
          },
        };
        request.onsuccess();
      });
      return request;
    },
  };
  try {
    const photo = new File(["photo bytes"], "photo.jpg", { type: "image/jpeg" });
    await saveChatWallpaper("person-a:chat-a", photo);
    const restored = await loadChatWallpaper("person-a:chat-a");
    assert.equal(await restored.text(), "photo bytes");
    assert.equal(await loadChatWallpaper("person-a:chat-b"), null);
    assert.equal(await loadChatWallpaper("person-b:chat-a"), null);
    assert.equal(closed, 4);
  } finally {
    globalThis.indexedDB = previous;
  }
});
