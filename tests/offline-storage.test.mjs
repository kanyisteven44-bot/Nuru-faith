import test from "node:test";
import assert from "node:assert/strict";
import { saveOfflineReading, getOfflineReading } from "../src/lib/offlineReading.ts";
test("offline text is available after reopening storage; interrupted writes reject", async () => {
  const rows = new Map();
  let fail = false;
  const old = globalThis.indexedDB;
  globalThis.indexedDB = {
    open: () => {
      const request = {};
      queueMicrotask(() => {
        request.result = {
          close: () => {},
          transaction: () => {
            const tx = {
              objectStore: () => ({
                put: (row) =>
                  queueMicrotask(() => {
                    if (fail) tx.onabort();
                    else {
                      rows.set(row.id, row);
                      tx.oncomplete();
                    }
                  }),
                get: (id) => {
                  const read = {};
                  queueMicrotask(() => {
                    read.result = rows.get(id);
                    read.onsuccess();
                  });
                  return read;
                },
              }),
            };
            return tx;
          },
        };
        request.onsuccess();
      });
      return request;
    },
  };
  try {
    const entry = {
      id: "book:123",
      kind: "book",
      title: "A complete archive edition",
      subtitle: "Author and preserved source notice",
      sections: [{ title: "First section", text: "Original text and licence" }],
    };
    await saveOfflineReading(entry);
    assert.deepEqual((await getOfflineReading(entry.id)).sections, entry.sections);
    fail = true;
    await assert.rejects(saveOfflineReading({ ...entry, id: "interrupted" }), /interrupted/);
    assert.equal(await getOfflineReading("interrupted"), undefined);
  } finally {
    globalThis.indexedDB = old;
  }
});
