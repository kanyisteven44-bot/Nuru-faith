import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
function worker({
  fetcher = async () => {
    throw Error("offline");
  },
  saved = new Map(),
} = {}) {
  const events = new Map();
  const deleted = [];
  const cached = [];
  const context = vm.createContext({
    self: {
      location: { origin: "https://nuru.test" },
      clients: { claim: async () => {} },
      skipWaiting: async () => {},
      addEventListener: (name, fn) => events.set(name, fn),
    },
    caches: {
      keys: async () => ["nuru-static-v6-arch-icon", "nuru-static-v7-offline-reading", "nuru-reading-shell-v1", "other-app"],
      delete: async (key) => deleted.push(key),
      match: async (key) => saved.get(typeof key === "string" ? key : key.url),
      open: async () => ({ addAll: async (urls) => cached.push(...urls), put: async () => {} }),
    },
    fetch: fetcher,
    URL,
    Response,
    setTimeout: (fn, ms) => {
      const t = setTimeout(fn, ms);
      t.unref();
      return t;
    },
    Promise,
  });
  vm.runInContext(fs.readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), context);
  return { events, deleted, cached };
}
async function navigate(w, path = "/bible") {
  let response;
  w.events.get("fetch")({
    request: { url: "https://nuru.test" + path, method: "GET", mode: "navigate" },
    respondWith: (p) => (response = p),
  });
  return response;
}
test("disconnected navigation opens the cached standalone reader, including expired-account routes", async () => {
  const w = worker({
    saved: new Map([["/offline.html", new Response("Saved Bible, courses and books")]]),
  });
  assert.equal(await (await navigate(w)).text(), "Saved Bible, courses and books");
});
test("worker updates retain downloaded reading cache and unrelated caches", async () => {
  const w = worker();
  let done;
  w.events.get("activate")({ waitUntil: (p) => (done = p) });
  await done;
  assert.deepEqual(w.deleted, ["nuru-static-v6-arch-icon", "nuru-static-v7-offline-reading"]);
});
test("offline install includes the reader script; private API traffic is never cached", async () => {
  const w = worker();
  let done;
  w.events.get("install")({ waitUntil: (p) => (done = p) });
  await done;
  assert.ok(w.cached.includes("/offline-reader.js"));
  for (const request of [
    { url: "https://supabase.test/rest/v1/messages", method: "GET" },
    { url: "https://nuru.test/api/private", method: "POST" },
    { url: "https://nuru.test/api/private", method: "GET", destination: "" },
  ]) {
    let intercepted = false;
    w.events.get("fetch")({ request, respondWith: () => (intercepted = true) });
    assert.equal(intercepted, false);
  }
});
test("online navigation preserves the server response rather than replacing it with offline content", async () => {
  const w = worker({ fetcher: async () => new Response("Live app") });
  assert.equal(await (await navigate(w)).text(), "Live app");
});
