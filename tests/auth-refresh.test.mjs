import test from "node:test";
import assert from "node:assert/strict";
import { createAuthRefreshHandler } from "../src/lib/authRefresh.ts";

function harness() {
  let id = 0;
  const tasks = new Map();
  const results = [];
  const handler = createAuthRefreshHandler(
    (changed) => results.push(changed),
    (work) => {
      tasks.set(++id, work);
      return id;
    },
    (timer) => tasks.delete(timer),
  );
  return {
    handler,
    results,
    tasks,
    flush() {
      for (const work of tasks.values()) work();
      tasks.clear();
    },
  };
}
test("restoring and refocusing the same account does not reload routes or data", () => {
  const h = harness();
  h.handler.handle("INITIAL_SESSION", "alice");
  for (let i = 0; i < 20; i++) h.handler.handle("SIGNED_IN", "alice");
  h.handler.handle("TOKEN_REFRESHED", "alice");
  h.flush();
  assert.deepEqual(h.results, []);
});
test("sign-in work is deferred until the auth callback has released its lock", () => {
  const h = harness();
  h.handler.handle("INITIAL_SESSION", null);
  h.handler.handle("SIGNED_IN", "alice");
  assert.deepEqual(h.results, []);
  h.flush();
  assert.deepEqual(h.results, [true]);
});
test("switching accounts and signing out clears private query data", () => {
  const h = harness();
  h.handler.handle("INITIAL_SESSION", "alice");
  h.handler.handle("SIGNED_IN", "bob");
  h.flush();
  h.handler.handle("SIGNED_OUT", null);
  h.flush();
  assert.deepEqual(h.results, [true, true]);
});
test("profile updates refresh data without clearing the current account", () => {
  const h = harness();
  h.handler.handle("INITIAL_SESSION", "alice");
  h.handler.handle("USER_UPDATED", "alice");
  h.flush();
  assert.deepEqual(h.results, [false]);
});
test("rapid auth changes coalesce and unmount cancels pending work", () => {
  const h = harness();
  h.handler.handle("INITIAL_SESSION", "alice");
  h.handler.handle("SIGNED_OUT", null);
  h.handler.handle("SIGNED_IN", "bob");
  assert.equal(h.tasks.size, 1);
  h.flush();
  assert.deepEqual(h.results, [true]);
  h.handler.handle("USER_UPDATED", "bob");
  h.handler.dispose();
  h.flush();
  assert.deepEqual(h.results, [true]);
});
