import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
function room(entries) {
  class Node {
    children = [];
    hidden = false;
    value = "";
    textContent = "";
    attributes = {};
    classList = { toggle: () => {} };
    append(node) {
      this.children.push(node);
    }
    replaceChildren() {
      this.children = [];
    }
    setAttribute(key, value) {
      this.attributes[key] = value;
    }
  }
  const nodes = Object.fromEntries(
    ["list", "reader", "status", "filter", "search"].map((k) => ["#" + k, new Node()]),
  );
  const listeners = {};
  const storage = new Map();
  const open = {};
  let getAll;
  const db = {
    transaction: () => ({ objectStore: () => ({ getAll: () => (getAll = {}), delete: () => {} }) }),
  };
  const document = { querySelector: (key) => nodes[key], createElement: () => new Node() };
  vm.runInNewContext(
    fs.readFileSync(new URL("../public/offline-reader.js", import.meta.url), "utf8"),
    {
      document,
      navigator: { onLine: false },
      indexedDB: { open: () => open },
      localStorage: { getItem: (k) => storage.get(k), setItem: (k, v) => storage.set(k, v) },
      window: { addEventListener: (k, v) => (listeners[k] = v), scrollTo: () => {} },
      Date,
    },
  );
  open.result = db;
  open.onsuccess();
  getAll.result = structuredClone(entries);
  getAll.onsuccess();
  return nodes;
}
const entries = [
  {
    id: "bible:web:John",
    kind: "bible",
    title: "John",
    subtitle: "World English Bible",
    savedAt: 1,
    sections: [
      { title: "John 1", text: "Actual saved Scripture" },
      { title: "John 2", text: "Second chapter" },
    ],
  },
  {
    id: "course:hope",
    kind: "course",
    title: "Hope",
    subtitle: "Course",
    savedAt: 2,
    sections: [{ title: "First lesson", text: "Saved course lesson" }],
  },
];
test("offline room opens saved Bible and course text and supports chapter navigation", () => {
  const n = room(entries);
  assert.match(n["#status"].textContent, /Offline/);
  const card = n["#list"].children.find((c) => c.children.some((x) => x.textContent === "John"));
  card.children.find((x) => x.textContent === "Read").onclick();
  assert.equal(n["#reader"].hidden, false);
  assert.ok(n["#reader"].children.some((x) => x.textContent === "Actual saved Scripture"));
  const nav = n["#reader"].children.find((x) => x.attributes["aria-label"] === "Reading sections");
  nav.children.find((x) => x.textContent === "Next →").onclick();
  assert.ok(n["#reader"].children.some((x) => x.textContent === "Second chapter"));
});
test("reading filters keep courses separate and imported text is rendered as text", () => {
  const n = room([
    ...entries,
    {
      ...entries[0],
      id: "xss",
      title: "<script>alert(1)</script>",
      sections: [{ title: "Safe text", text: "<img src=x onerror=alert(1)>" }],
    },
  ]);
  n["#filter"].value = "course";
  n["#filter"].onchange();
  assert.equal(n["#list"].children.length, 1);
  n["#filter"].value = "";
  n["#search"].value = "script";
  n["#search"].oninput();
  assert.equal(n["#list"].children.length, 1);
  n["#list"].children[0].children.find((x) => x.textContent === "Read").onclick();
  assert.ok(n["#reader"].children.some((x) => x.textContent === "<img src=x onerror=alert(1)>"));
});
