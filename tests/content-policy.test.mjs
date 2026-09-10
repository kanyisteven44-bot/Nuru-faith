import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSearch,
  faithSearch,
  searchFilter,
  trustedChannel,
  trustRank,
} from "../src/lib/content-policy.ts";

test("search preserves Unicode, normalizes whitespace and bounds input", () => {
  assert.equal(normalizeSearch("  imani\t na\n tumaini  "), "imani na tumaini");
  assert.equal(normalizeSearch("église"), "église");
  assert.equal(normalizeSearch("a".repeat(200)).length, 120);
});
test("search input cannot inject PostgREST OR expressions or LIKE wildcards", () => {
  const filter = searchFilter(["title", "description"], "anxiety%,is_approved.eq.false,(%_");
  assert.equal(filter.split(",").length, 2);
  assert.equal((filter.match(/%/g) ?? []).length, 4);
  assert.equal(filter.includes("is_approved.eq.false"), false);
  assert.equal(searchFilter(["title"], "%_(),"), "title.ilike.%\uFFFF%");
});
test("Christian intent is explicit for broad life topics", () => {
  assert.match(faithSearch("ANXIETY"), /Bible faith peace/);
  assert.match(faithSearch("relationships"), /biblical relationships/);
  assert.match(faithSearch("motivation"), /purpose in Christ/);
});
test("unknown, discovery and blocked channels fail closed", () => {
  for (const level of [undefined, null, "", "discovery", "blocked", "Christian"])
    assert.equal(trustedChannel(level), false);
  for (const level of ["official", "verified", "trusted"])
    assert.equal(trustedChannel(level), true);
  assert.ok(trustRank("official") < trustRank("verified"));
  assert.ok(trustRank("verified") < trustRank("trusted"));
});
