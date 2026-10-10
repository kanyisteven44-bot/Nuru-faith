import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const apex = "nurufaith.co.ke";
const app = "app.nurufaith.co.ke";

test("only the former apex host is rewritten to the independently deployed ministry", () => {
  const rewrite = config.rewrites?.find((r) =>
    r.destination === "https://nuru-faith-ministry.vercel.app/:path*"
  );
  assert.ok(rewrite, "ministry rewrite exists");
  assert.equal(rewrite.source, "/:path*");
  assert.deepEqual(rewrite.has, [{ type: "host", value: apex }]);
  assert.ok(config.rewrites.every((r) => !r.has?.some((h) => h.type === "host" && h.value === app)));
});

test("auth links arriving at the old apex are forwarded to the youth app", () => {
  for (const route of ["/auth", "/auth-callback", "/reset-password", "/verify", "/confirm"]) {
    const rule = config.redirects?.find((r) => r.source === route &&
      r.has?.some((h) => h.type === "host" && h.value === apex));
    assert.ok(rule, route);
    assert.equal(rule.destination, "https://" + app + route);
    assert.equal(rule.permanent, false, "auth must not be permanently cached");
  }
  for (const key of ["code", "token_hash"]) {
    const rule = config.redirects?.find((r) => r.source === "/" &&
      r.has?.some((h) => h.type === "query" && h.key === key));
    assert.ok(rule, "old Site URL fallback for " + key);
    assert.equal(rule.destination, "https://" + app + "/auth-callback");
  }
});

test("youth share links arriving at former apex still point to the youth app", () => {
  for (const path of ["/home", "/reels", "/bible", "/passage", "/messages"]) {
    assert.ok(config.redirects.some((r) => r.source === path && r.destination === "https://" + app + path &&
      r.has?.some((h) => h.type === "host" && h.value === apex)), path);
  }
});
