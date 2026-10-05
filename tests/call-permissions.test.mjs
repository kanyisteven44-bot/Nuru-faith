import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("production lets Nuru request camera and microphone while restricting other origins", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const policy = config.headers
    .find((rule) => rule.source === "/(.*)")
    .headers.find((header) => header.key === "Permissions-Policy").value;
  assert.match(policy, /(?:^|,\s*)camera=\(self\)(?:,|$)/);
  assert.match(policy, /(?:^|,\s*)microphone=\(self\)(?:,|$)/);
  assert.doesNotMatch(policy, /(?:camera|microphone)=\*/);
  assert.match(policy, /geolocation=\(\)/);
});
