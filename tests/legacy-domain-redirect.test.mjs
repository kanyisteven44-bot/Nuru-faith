import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

test("old Nuru hosts redirect their paths to the verified .co.ke app", () => {
  const redirects = config.redirects ?? [];
  for (const legacyHost of ["nurufaith.website", "www.nurufaith.website"]) {
    const matching = redirects.filter((redirect) =>
      redirect.has?.some((condition) =>
        condition.type === "host" && condition.value === legacyHost
      )
    );
    assert.equal(matching.length, 1, `expected exactly one redirect for ${legacyHost}`);
    assert.equal(matching[0].source, "/:path*");
    assert.equal(matching[0].destination, "https://nurufaith.co.ke/:path*");
    assert.equal(matching[0].statusCode, 307);
  }
  assert.ok(!redirects.some((redirect) =>
    redirect.has?.some((condition) =>
      condition.type === "host" && condition.value === "nurufaith.co.ke"
    )
  ), "canonical host must never redirect back into itself");
});
