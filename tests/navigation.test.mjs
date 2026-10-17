import test from "node:test";
import assert from "node:assert/strict";
import { isNavigationActive } from "../src/lib/navigation.ts";

test("navigation respects route boundaries and trailing slashes", () => {
  assert.equal(isNavigationActive("/messages/thread-1", "/messages"), true);
  assert.equal(isNavigationActive("/messages/", "/messages"), true);
  assert.equal(isNavigationActive("/messages?view=all", "/messages"), true);
  assert.equal(isNavigationActive("/messages-archive", "/messages"), false);
  assert.equal(isNavigationActive("/bible-study", "/bible"), false);
});
test("learning stays selected throughout lessons, devotions and series", () => {
  for (const path of [
    "/grow",
    "/faith-courses",
    "/faith-courses/how-to-pray",
    "/devotionals",
    "/series/a/1",
  ])
    assert.equal(isNavigationActive(path, "/grow"), true, path);
  for (const path of ["/groups", "/series-extra", "/music"])
    assert.equal(isNavigationActive(path, "/grow"), false, path);
});
