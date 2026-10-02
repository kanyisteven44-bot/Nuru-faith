import { test } from "node:test";
import assert from "node:assert/strict";
import { eligibleMusicVideo, isoSeconds } from "../src/lib/musicImport.ts";
import { playableAudioUrl, youtubeVideoId } from "../src/lib/mediaPlayback.ts";
const video = {
  id: "abcdefghijk",
  snippet: { channelId: "official", categoryId: "10", title: "Worship" },
  status: { embeddable: true, privacyStatus: "public", uploadStatus: "processed" },
  contentDetails: { duration: "PT4M30S" },
};
test("catalogue excludes non-music, private, unembeddable, foreign-channel and Kenya-blocked videos", () => {
  assert.equal(eligibleMusicVideo(video, "official"), true);
  assert.equal(eligibleMusicVideo(video, "another"), false);
  for (const patch of [
    { snippet: { ...video.snippet, categoryId: "22" } },
    { status: { ...video.status, embeddable: false } },
    { status: { ...video.status, privacyStatus: "private" } },
    { contentDetails: { duration: "PT20S" } },
    { contentDetails: { duration: "PT4M", regionRestriction: { blocked: ["KE"] } } },
  ])
    assert.equal(eligibleMusicVideo({ ...video, ...patch }, "official"), false);
});
test("real durations and safe playback URLs", () => {
  assert.equal(isoSeconds("PT1H2M3S"), 3723);
  assert.equal(isoSeconds("live"), 0);
  assert.equal(playableAudioUrl("javascript:alert(1)"), null);
  assert.equal(
    playableAudioUrl("https://publisher.example/episode.mp3"),
    "https://publisher.example/episode.mp3",
  );
  assert.equal(youtubeVideoId("abcdefghijk"), "abcdefghijk");
  assert.equal(youtubeVideoId("wrong"), null);
});
