import assert from "node:assert/strict";
import test from "node:test";
import { isChristianDiscoveryCandidate } from "../src/lib/reelDiscoveryPolicy.ts";

test("accepts clearly Christian discovery content", () => {
  assert.equal(
    isChristianDiscoveryCandidate("A prayer for anxious days", "Bible encouragement"),
    true,
  );
  assert.equal(
    isChristianDiscoveryCandidate("Jesus changes everything", "A short testimony"),
    true,
  );
});

test("rejects generic and explicitly risky discovery content", () => {
  assert.equal(isChristianDiscoveryCandidate("Morning motivation", "Start your day well"), false);
  assert.equal(
    isChristianDiscoveryCandidate("Christian celebrity gossip", "Latest church drama"),
    false,
  );
  assert.equal(isChristianDiscoveryCandidate("Bible prank", "A funny prank at church"), false);
});
