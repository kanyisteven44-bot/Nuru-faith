import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("mobile production QA runs each day and whenever its test code changes", () => {
  const flow = readFileSync(new URL("../.github/workflows/mobile-browser-audit.yml", import.meta.url), "utf8");
  assert.match(flow, /cron: "23 3 \* \* \*"/);
  assert.match(flow, /"scripts\/audit-live-mobile\.mjs"/);
  assert.match(flow, /"package\.json"/);
  assert.match(flow, /"package-lock\.json"/);
  assert.match(flow, /NURU_QA_EMAIL:/);
  assert.match(flow, /NURU_QA_PASSWORD:/);
  assert.match(flow, /run: node scripts\/audit-live-mobile\.mjs/);
  assert.match(flow, /npx lighthouse https:\/\/nurufaith\.co\.ke\//);
});
