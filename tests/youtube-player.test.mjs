import { test } from "node:test";
import assert from "node:assert/strict";
import { youtubeEmbedUrl } from "../src/lib/youtubeEmbed.ts";

const params = (url) => new URL(url).searchParams;

test("autoplay always starts muted, because browsers block audible autoplay", () => {
  const p = params(youtubeEmbedUrl({ videoId: "abc123", autoplay: true, muted: false }));
  assert.equal(p.get("autoplay"), "1");
  assert.equal(p.get("mute"), "1");
});

test("the IFrame API is enabled so sound and playback can be driven without a reload", () => {
  const p = params(youtubeEmbedUrl({ videoId: "abc123" }));
  assert.equal(p.get("enablejsapi"), "1");
  assert.equal(p.get("playsinline"), "1");
});

test("muting does not change the URL, so toggling sound never restarts the video", () => {
  const base = { videoId: "abc123", autoplay: true, loop: true, controls: false };
  assert.equal(
    youtubeEmbedUrl({ ...base, muted: true }),
    youtubeEmbedUrl({ ...base, muted: false }),
    "a muted/unmuted difference in the src would reload the iframe and restart playback",
  );
});

test("looping a single video needs itself as the playlist", () => {
  const p = params(youtubeEmbedUrl({ videoId: "abc123", loop: true }));
  assert.equal(p.get("loop"), "1");
  assert.equal(p.get("playlist"), "abc123");
});

test("reels hide native controls; other surfaces keep them", () => {
  assert.equal(params(youtubeEmbedUrl({ videoId: "a", controls: false })).get("controls"), "0");
  assert.equal(params(youtubeEmbedUrl({ videoId: "a" })).get("controls"), "1");
});

test("playback stays on the privacy-preserving host and never proxies media", () => {
  const url = new URL(youtubeEmbedUrl({ videoId: "abc123" }));
  assert.equal(url.origin, "https://www.youtube-nocookie.com");
  assert.equal(url.pathname, "/embed/abc123");
});

test("a playlist with no video id uses the videoseries embed", () => {
  const url = new URL(youtubeEmbedUrl({ playlistId: "PL123" }));
  assert.equal(url.pathname, "/embed/videoseries");
  assert.equal(url.searchParams.get("list"), "PL123");
});
