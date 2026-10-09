import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("notifications use a compact, collapsible incoming call guide", () => {
  const screen = read("src/routes/_authenticated/notifications.tsx");
  assert.match(screen, /callHelpOpen, setCallHelpOpen/);
  assert.match(screen, /aria-expanded=\{callHelpOpen\}/);
  assert.match(screen, /Incoming calls when Nuru is closed/);
  assert.match(screen, /\{callHelpOpen && \(/);
  assert.match(screen, /Messages and call history/);
  assert.doesNotMatch(screen, /mx-4 mb-4 flex items-start gap-3 rounded-2xl border border-primary\/25 bg-primary\/5 p-4/);
});

test("each notification uses a compact shared list rather than huge repeated cards", () => {
  const screen = read("src/routes/_authenticated/notifications.tsx");
  assert.match(screen, /divide-y divide-border\/70 overflow-hidden rounded-2xl/);
  assert.match(screen, /visibleRows\.map\(\(n\) =>/);
  assert.match(screen, /min-h-\[72px\]/);
  assert.match(screen, /className="mt-1 block truncate text-\[12px\]/);
  assert.match(screen, /pb-8/);
  assert.match(screen, /refetchInterval: 30_000/);
});

test("real notifications stay visible while repeated test alerts can be expanded", () => {
  const screen = read("src/routes/_authenticated/notifications.tsx");
  assert.match(screen, /row\.category === "system" && row\.title === "Nuru Faith test alert"/);
  assert.match(screen, /!showTestAlerts \? rows\.filter\(\(n\) => !isTestAlert\(n\)\)/);
  assert.match(screen, /Show/);
  assert.match(screen, /setShowTestAlerts\(\(value\) => !value\)/);
  assert.match(screen, /"All", "Calls", "Social", "Mentorship", "Events"/);
  assert.match(screen, /tab === "Calls" \? "call"/);
});

test("push settings remain functional and show status accurately", () => {
  const screen = read("src/routes/_authenticated/notifications.tsx");
  assert.match(screen, /await enableWebPush\(\)/);
  assert.match(screen, /await disableWebPush\(\)/);
  assert.match(screen, /sendTestWebPush\(\)/);
  assert.match(screen, /await getWebPushState\(\)/);
  assert.match(screen, /setState\("error"\)/);
  assert.match(screen, /Notification preferences/);
  assert.match(screen, /manageOpen &&/);
  assert.match(screen, /Background alerts not supported here/);
});
