import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("production smoke checks both domains and old app resources hourly", () => {
  const script = readFileSync(new URL("../scripts/check-production-domains.mjs", import.meta.url), "utf8");
  const workflow = readFileSync(new URL("../.github/workflows/production-smoke.yml", import.meta.url), "utf8");
  assert.match(script, /https:\/\/nurufaith\.co\.ke/);
  assert.match(script, /https:\/\/nurufaith\.website/);
  assert.match(script, /manifest\.webmanifest/);
  assert.match(script, /\/sw\.js/);
  assert.match(script, /\/admin\?section=dashboard/);
  assert.match(script, /\/sitemap\.xml/);
  assert.match(script, /noindex, nofollow/);
  assert.match(script, /content-security-policy/);
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /cron: "17 \* \* \* \*"/);
  assert.match(workflow, /node scripts\/check-production-domains\.mjs/);
});
