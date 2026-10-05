import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("deployed security policy permits the Scripture API used by the reader and daily verses", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const header = config.headers
    .find((rule) => rule.source === "/(.*)")
    .headers.find((item) => item.key === "Content-Security-Policy");
  const connect = header.value
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("connect-src "))
    .split(/\s+/)
    .slice(1);
  assert.ok(
    connect.includes("https://bible-api.com"),
    "Scripture requests must not be blocked by CSP",
  );
  assert.ok(!connect.includes("*"), "Keep the network allowlist restricted");
});
