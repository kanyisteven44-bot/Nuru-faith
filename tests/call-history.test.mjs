import test from "node:test";
import assert from "node:assert/strict";
import { isMissedCall, callHistoryLabel } from "../src/lib/callHistory.ts";
const created = "2026-10-05T19:00:00Z";
const now = Date.parse(created) + 90000;
const base = {
  id: "call",
  caller_id: "caller",
  callee_id: "receiver",
  kind: "audio",
  status: "ringing",
  created_at: created,
  answered_at: null,
  ended_at: null,
};
test("an expired unanswered ringing call is missed, even when caller app closed", () => {
  assert.equal(isMissedCall(base, now - 1), false);
  assert.equal(isMissedCall(base, now), true);
  assert.equal(callHistoryLabel(base, "receiver", now), "Missed audio call");
});
test("caller cancellation before an answer is a missed call for recipient", () => {
  assert.equal(
    callHistoryLabel({ ...base, status: "ended" }, "receiver", now),
    "Missed audio call",
  );
  assert.equal(
    callHistoryLabel({ ...base, status: "ended" }, "caller", now),
    "Unanswered audio call",
  );
});
test("answered video calls never become missed calls", () => {
  assert.equal(
    isMissedCall({ ...base, kind: "video", status: "ended", answered_at: created }, now),
    false,
  );
  assert.equal(
    callHistoryLabel(
      { ...base, kind: "video", status: "ended", answered_at: created },
      "receiver",
      now,
    ),
    "Incoming video call",
  );
});
test("declining a call stays distinct from missing it", () => {
  assert.equal(isMissedCall({ ...base, status: "declined" }, now), false);
  assert.equal(
    callHistoryLabel({ ...base, status: "declined" }, "receiver", now),
    "Declined audio call",
  );
});
test("explicit unanswered video timeout is labelled correctly", () => {
  assert.equal(
    callHistoryLabel({ ...base, kind: "video", status: "missed" }, "receiver", now),
    "Missed video call",
  );
});
