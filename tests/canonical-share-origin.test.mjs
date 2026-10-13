import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  OFFICIAL_NURU_ORIGIN,
  canonicalShareUrl,
  publicNuruUrl,
} from "../src/lib/publicLinks.ts";

const read = (file) =>
  readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("new Nuru share links use only the verified co.ke origin", () => {
  assert.equal(OFFICIAL_NURU_ORIGIN, "https://nurufaith.co.ke");
  assert.equal(publicNuruUrl("/ai"), "https://nurufaith.co.ke/ai");
  assert.equal(publicNuruUrl("/admin?section=dashboard"), "https://nurufaith.co.ke/admin?section=dashboard");
  assert.equal(publicNuruUrl("/passage?book=John&chapter=3"), "https://nurufaith.co.ke/passage?book=John&chapter=3");
  assert.equal(publicNuruUrl("https://attacker.example/"), "https://nurufaith.co.ke");
});

test("converting old Nuru shares preserves route, query and hash without a redirect", () => {
  assert.equal(
    canonicalShareUrl("https://nurufaith.website/reels?reel=xyz#comments"),
    "https://nurufaith.co.ke/reels?reel=xyz#comments",
  );
  assert.equal(
    canonicalShareUrl("https://www.nurufaith.website/ai"),
    "https://nurufaith.co.ke/ai",
  );
  assert.equal(
    canonicalShareUrl("https://www.nurufaith.co.ke/about"),
    "https://nurufaith.co.ke/about",
  );
  assert.equal(canonicalShareUrl("/bible"), "https://nurufaith.co.ke/bible");
});

test("external gospel media destinations are not changed", () => {
  assert.equal(
    canonicalShareUrl("https://www.youtube.com/watch?v=abc"),
    "https://www.youtube.com/watch?v=abc",
  );
  assert.equal(canonicalShareUrl("javascript:alert(1)"), "https://nurufaith.co.ke");
  assert.equal(canonicalShareUrl("data:text/html,abc"), "https://nurufaith.co.ke");
});

test("public sharing components import the canonical-link helper", () => {
  const files = [
    "src/routes/passage.tsx",
    "src/routes/_authenticated/bible.tsx",
    "src/routes/_authenticated/reels.tsx",
    "src/components/nuru/PostCard.tsx",
    "src/routes/_authenticated/series.$slug.$position.tsx",
    "src/components/youtube/MediaActions.tsx",
    "src/components/youtube/MediaCatalog.tsx",
  ];
  for (const path of files) {
    const source = read(path);
    assert.match(source, /from "@\/lib\/publicLinks"/, path);
  }
  assert.doesNotMatch(read("src/routes/_authenticated/reels.tsx"), /window\.location\.origin/);
  assert.doesNotMatch(read("src/routes/_authenticated/bible.tsx"), /window\.location\.origin/);
  assert.doesNotMatch(read("src/routes/passage.tsx"), /window\.location\.origin/);
});
