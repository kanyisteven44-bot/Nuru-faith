import assert from "node:assert/strict";
import test from "node:test";
import { detectReelSource } from "../src/lib/reelImport.ts";

test("detects YouTube watch, youtu.be and Shorts links", () => {
  const watch = detectReelSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s");
  assert.equal(watch?.sourceType, "youtube");
  assert.equal(watch?.externalId, "dQw4w9WgXcQ");
  assert.equal(watch?.externalUrl, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.equal(watch?.posterUrl, "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");

  const short = detectReelSource("https://youtu.be/dQw4w9WgXcQ?si=abc");
  assert.equal(short?.sourceType, "youtube");
  assert.equal(short?.externalId, "dQw4w9WgXcQ");

  const shorts = detectReelSource("https://www.youtube.com/shorts/dQw4w9WgXcQ");
  assert.equal(shorts?.sourceType, "youtube");
  assert.equal(shorts?.externalId, "dQw4w9WgXcQ");
});

test("detects public TikTok video links", () => {
  const tiktok = detectReelSource("https://www.tiktok.com/@nurufaith/video/7345678901234567890");
  assert.equal(tiktok?.sourceType, "tiktok");
  assert.equal(tiktok?.externalId, "7345678901234567890");
  assert.equal(tiktok?.posterUrl, null);
});

test("detects Instagram reel, post and tv links", () => {
  const reel = detectReelSource("https://www.instagram.com/reel/Cabc123XYZ/?utm_source=ig");
  assert.equal(reel?.sourceType, "instagram");
  assert.equal(reel?.externalId, "Cabc123XYZ");
  assert.equal(reel?.externalUrl, "https://www.instagram.com/reel/Cabc123XYZ/");

  const post = detectReelSource("https://instagram.com/p/Cxyz789/");
  assert.equal(post?.sourceType, "instagram");
});

test("rejects unrelated or malformed links", () => {
  assert.equal(detectReelSource("not a url"), null);
  assert.equal(detectReelSource("https://example.com/video/123"), null);
  assert.equal(detectReelSource("https://www.youtube.com/"), null);
  assert.equal(detectReelSource(""), null);
  assert.equal(detectReelSource("   "), null);
});
