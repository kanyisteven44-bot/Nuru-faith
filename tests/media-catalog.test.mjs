import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_SONG_SECONDS,
  eligibleMusicVideo,
  eligiblePodcastVideo,
  isoSeconds,
} from "../src/lib/musicImport.ts";
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

test("spoken uploads and short promotions stay out of music", () => {
  for (const title of [
    "The Bold Podcast: Handling Conflicts",
    "New music teaser",
    "Tour announcement",
    "Marriage works",
  ])
    assert.equal(
      eligibleMusicVideo({ ...video, snippet: { ...video.snippet, title } }, "official"),
      false,
    );
  assert.equal(
    eligibleMusicVideo({ ...video, contentDetails: { duration: "PT1M59S" } }, "official"),
    false,
  );
  assert.equal(
    eligibleMusicVideo({ ...video, contentDetails: { duration: "PT2M" } }, "official"),
    true,
  );
});

test("video episodes accept teaching categories but enforce channel and playback eligibility", () => {
  const episode = {
    ...video,
    snippet: { ...video.snippet, categoryId: "27", title: "Bible podcast" },
  };
  assert.equal(eligiblePodcastVideo(episode, "official"), true);
  assert.equal(eligibleMusicVideo(episode, "official"), false);
  assert.equal(eligiblePodcastVideo(episode, "unreviewed"), false);
  assert.equal(
    eligiblePodcastVideo(
      { ...episode, status: { ...episode.status, embeddable: false } },
      "official",
    ),
    false,
  );
  assert.equal(
    eligiblePodcastVideo(
      { ...episode, contentDetails: { duration: "PT20M", regionRestriction: { allowed: ["US"] } } },
      "official",
    ),
    false,
  );
});

/* ---------- songs have an upper length bound ---------- */

const song = (seconds, title = "Artist - A Worship Song (Official Video)") => ({
  id: "abcdefghijk",
  snippet: { channelId: "UC0000000000000000000000", categoryId: "10", title },
  status: { embeddable: true, privacyStatus: "public", uploadStatus: "processed" },
  contentDetails: { duration: `PT${seconds}S` },
});

test("a normal song is eligible", () => {
  assert.equal(eligibleMusicVideo(song(240), "UC0000000000000000000000"), true);
});

test("an extended live worship set is still a song", () => {
  assert.equal(eligibleMusicVideo(song(MAX_SONG_SECONDS - 1), "UC0000000000000000000000"), true);
});

test("a livestreamed service is not a song", () => {
  // The real catalogue took in a 4-hour "The Gathering | Episode 10" this way.
  assert.equal(eligibleMusicVideo(song(15348), "UC0000000000000000000000"), false);
  assert.equal(eligibleMusicVideo(song(43258), "UC0000000000000000000000"), false);
});

test("episode and livestream titles are rejected at any length", () => {
  const ch = "UC0000000000000000000000";
  assert.equal(eligibleMusicVideo(song(300, "The Gathering | Episode 10"), ch), false);
  assert.equal(eligibleMusicVideo(song(300, "Sunday Service 12 Oct"), ch), false);
  assert.equal(eligibleMusicVideo(song(300, "3 Hours of Worship"), ch), false);
  assert.equal(eligibleMusicVideo(song(300, "Full Album - Live"), ch), false);
});

test("a clip under two minutes is still too short", () => {
  assert.equal(eligibleMusicVideo(song(60), "UC0000000000000000000000"), false);
});
