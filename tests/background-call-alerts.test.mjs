import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const swSource = read("public/sw.js");

function simulateWorker() {
  const handlers = {};
  const shown = [];
  const self = {
    location: { origin: "https://app.nurufaith.co.ke", href: "https://app.nurufaith.co.ke/sw.js" },
    addEventListener: (type, listener) => { handlers[type] = listener; },
    registration: { showNotification: async (title, options) => { shown.push({ title, options }); } },
    clients: { matchAll: async () => [], openWindow: async () => null },
  };
  vm.runInNewContext(swSource, { self, URL, Promise, console, setTimeout, caches: {} }, { filename: "sw.js" });
  return { handlers, shown, self };
}

async function push(worker, data) {
  let task;
  worker.handlers.push({
    data: { json: () => data },
    waitUntil: (promise) => { task = promise; },
  });
  await task;
  return worker.shown.at(-1);
}

test("incoming calls show an actionable notification with the message thread deep link", async () => {
  const worker = simulateWorker();
  const result = await push(worker, {
    title: "Incoming audio call",
    category: "call",
    priority: "critical",
    url: "/messages?user=00000000-0000-4000-8000-000000000001",
  });
  assert.equal(result.options.data.url, "/messages?user=00000000-0000-4000-8000-000000000001");
  assert.equal(result.options.requireInteraction, true);
  assert.equal(result.options.renotify, true);
  assert.equal(result.options.actions[0].action, "answer");
});

test("push notifications cannot navigate to attacker origins", async () => {
  const worker = simulateWorker();
  for (const url of ["https://malicious.test/", "//malicious.test/", "/\\malicious.test/", "javascript:alert(1)"]) {
    const result = await push(worker, { category: "call", url });
    assert.equal(result.options.data.url, "/notifications");
  }
});

test("opening a call alert waits for page navigation before focusing the app", async () => {
  const worker = simulateWorker();
  const order = [];
  let redirected;
  const existing = {
    url: "https://app.nurufaith.co.ke/home",
    navigate: async (target) => {
      order.push("navigate " + target);
      return redirected;
    },
    focus: async () => { order.push("premature-focus"); },
  };
  redirected = { focus: async () => { order.push("destination-focused"); } };
  worker.self.clients.matchAll = async () => [existing];
  worker.self.clients.openWindow = async () => { order.push("openWindow"); return null; };
  let task;
  worker.handlers.notificationclick({
    notification: { close: () => {}, data: { url: "/messages?user=00000000-0000-4000-8000-000000000001" } },
    action: "answer",
    waitUntil: (promise) => { task = promise; },
  });
  await task;
  assert.deepEqual(order, [
    "navigate /messages?user=00000000-0000-4000-8000-000000000001",
    "destination-focused",
  ]);
});

test("notifications screen exposes call alerts and permission troubleshooting", () => {
  const screen = read("src/routes/_authenticated/notifications.tsx");
  const settings = read("src/routes/_authenticated/settings.tsx");
  assert.match(screen, /"All", "Calls", "Social", "Mentorship", "Events"/);
  assert.match(screen, /tab === "Calls" \? "call"/);
  assert.match(screen, /Incoming calls when Nuru is closed/);
  assert.match(screen, /setState\("error"\)/);
  assert.match(screen, /Background alerts not supported here/);
  assert.match(screen, /Test alert/);
  assert.match(settings, /Set up alerts for calls and messages, even when Nuru is closed/);
});
