import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  MATCH_THRESHOLD,
  isKnownChannel,
  normaliseName,
  partitionAgainstExisting,
  pickBestChannel,
  qualifiesAsMusicSource,
  scoreChannelMatch,
  toReviewedSource,
  faithSignal,
  autoApprovable,
  DISCOVERY_QUERIES,
} from "../src/lib/musicSourceResolver.ts";

const channel = (
  title,
  channelId = "UC" + title.replace(/\W/g, "").padEnd(22, "x").slice(0, 22),
) => ({
  channelId,
  title,
});

test("normaliseName strips the noise words channels pad titles with", () => {
  assert.equal(normaliseName("SHIRU WA GP . HSC"), "shiru wa gp");
  assert.equal(normaliseName("Mercy Chinwo Official"), "mercy chinwo");
  assert.equal(normaliseName("Gloria Muliro Music"), "gloria muliro");
  assert.equal(normaliseName("REUBEN KIGAME OFFICIAL"), "reuben kigame");
});

test("an exact name match scores 1", () => {
  assert.equal(scoreChannelMatch("Ben Githae", channel("Ben Githae")), 1);
  assert.equal(scoreChannelMatch("Ben Githae", channel("BEN GITHAE OFFICIAL")), 1);
});

test("a channel containing the full name still clears the threshold", () => {
  const score = scoreChannelMatch("Emmy Kosgei", channel("Emmy Kosgei Worship Africa"));
  assert.ok(score >= MATCH_THRESHOLD, `expected >= ${MATCH_THRESHOLD}, got ${score}`);
});

test("a single-word name never matches a longer title on its own", () => {
  // "Grace" must not latch onto the first big channel with Grace in the name.
  assert.equal(scoreChannelMatch("Grace", channel("Grace Community Church")), 0);
  assert.equal(scoreChannelMatch("Bahati", channel("Bahati Bukuku")), 0);
});

test("an unrelated channel scores below the threshold", () => {
  assert.ok(scoreChannelMatch("Lilian Rotich", channel("DJ Kalenjin Mixes")) < MATCH_THRESHOLD);
  assert.ok(
    scoreChannelMatch("Joyce Langat", channel("Kalenjin Gospel Songs Mix")) < MATCH_THRESHOLD,
  );
});

test("pickBestChannel accepts a clear winner", () => {
  const result = pickBestChannel("Ben Githae", [
    channel("Kikuyu Gospel Mix 2024"),
    channel("Ben Githae"),
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.channel.title, "Ben Githae");
});

test("pickBestChannel refuses when nothing clears the threshold", () => {
  const result = pickBestChannel("Lilian Rotich", [
    channel("Kalenjin Gospel Songs Mix"),
    channel("DJ KIPSOT"),
  ]);
  assert.equal(result.ok, false);
  assert.match(result.reason, /below/);
});

test("pickBestChannel refuses an ambiguous field rather than guessing", () => {
  // Two channels with the same normalised name: a person must decide.
  const result = pickBestChannel("Joyce Langat", [
    channel("Joyce Langat", "UCaaaaaaaaaaaaaaaaaaaaaa"),
    channel("Joyce Langat Official", "UCbbbbbbbbbbbbbbbbbbbbbb"),
  ]);
  assert.equal(result.ok, false);
  assert.match(result.reason, /ambiguous/);
});

test("pickBestChannel reports no results rather than throwing", () => {
  const result = pickBestChannel("Nobody At All", []);
  assert.equal(result.ok, false);
  assert.match(result.reason, /no search results/);
});

test("a channel needs real music uploads to qualify", () => {
  assert.equal(qualifiesAsMusicSource(0), false);
  assert.equal(qualifiesAsMusicSource(2), false);
  assert.equal(qualifiesAsMusicSource(3), true);
  assert.equal(qualifiesAsMusicSource(40), true);
});

test("candidates already reviewed are not looked up again", () => {
  const existing = [
    { name: "Christina Shusho", youtube_channel_id: "UCbS405TjBrRSWTD6uEXDixA" },
    { name: "Gloria Muliro Music", youtube_channel_id: "UCzzzzzzzzzzzzzzzzzzzzzz" },
  ];
  const { fresh, alreadyKnown } = partitionAgainstExisting(
    [
      { name: "Christina Shusho" },
      { name: "Gloria Muliro" }, // matches "Gloria Muliro Music" once normalised
      { name: "Ben Githae" },
    ],
    existing,
  );
  assert.deepEqual(
    alreadyKnown.map((c) => c.name),
    ["Christina Shusho", "Gloria Muliro"],
  );
  assert.deepEqual(
    fresh.map((c) => c.name),
    ["Ben Githae"],
  );
});

test("a channel id already reviewed under a different name is caught", () => {
  const existing = [{ name: "Whoever", youtube_channel_id: "UCbS405TjBrRSWTD6uEXDixA" }];
  assert.equal(isKnownChannel("UCbS405TjBrRSWTD6uEXDixA", existing), true);
  assert.equal(isKnownChannel("UCsomethingelse00000000", existing), false);
});

test("toReviewedSource records proof in the shape the seed expects", () => {
  const row = toReviewedSource({
    channel: {
      channelId: "UC12i9YDDwHaAKTBcQKzSFVw",
      title: "SHIRU WA GP . HSC",
      avatarUrl: "https://yt3.googleusercontent.com/example",
    },
    languages: ["ki"],
    sample: { id: "CM_hyg9N8DU", title: "SHIRU WA GP - NDAGUTHAITHA" },
    verifiedAt: "2026-10-04",
  });
  assert.deepEqual(row, {
    name: "SHIRU WA GP . HSC",
    youtube_channel_id: "UC12i9YDDwHaAKTBcQKzSFVw",
    content_kind: "music",
    language_codes: ["ki"],
    avatar_url: "https://yt3.googleusercontent.com/example",
    verification_url: "https://www.youtube.com/channel/UC12i9YDDwHaAKTBcQKzSFVw",
    verified_at: "2026-10-04",
    sample_title: "SHIRU WA GP - NDAGUTHAITHA",
    sample_video_id: "CM_hyg9N8DU",
  });
});

test("a verified row always carries a channel to check it against", () => {
  const row = toReviewedSource({
    channel: { channelId: "UCaaaaaaaaaaaaaaaaaaaaaa", title: "Someone", avatarUrl: null },
    languages: ["kln"],
    sample: { id: "abcdefghijk", title: "A song" },
    verifiedAt: "2026-10-04",
  });
  assert.ok(row.verification_url.endsWith(row.youtube_channel_id));
  assert.ok(row.sample_video_id.length === 11);
});

/* ---------- bulk discovery ---------- */

test("a channel that says it is gospel passes the faith signal", () => {
  for (const title of [
    "Sample Gospel Ministries",
    "Kikuyu Worship Channel",
    "Nyimbo za Injili",
    "Praise and Worship TV",
  ]) {
    assert.equal(faithSignal(channel(title)).gospel, true, `${title} should read as gospel`);
  }
});

test("a secular music channel does not pass on search terms alone", () => {
  // These are the shape of thing a "gospel" search actually returns.
  for (const title of ["Benga Classics", "Ohangla Hits", "Top Kenyan Music"]) {
    assert.equal(faithSignal(channel(title)).gospel, false, `${title} should not read as gospel`);
  }
});

test("mix and DJ channels are disqualified outright", () => {
  const dj = faithSignal({ ...channel("DJ Kipsot Gospel Mix"), description: "" });
  assert.equal(dj.gospel, false);
  assert.ok(dj.disqualified, "should say which word disqualified it");

  const mix = faithSignal({ ...channel("Kalenjin Gospel Mix Vol 8"), description: "" });
  assert.equal(mix.gospel, false);
});

test("the description counts, not just the title", () => {
  const signal = faithSignal({
    ...channel("Naserian"),
    description: "Maasai gospel songs and worship from Narok.",
  });
  assert.equal(signal.gospel, true);
});

test("auto-approval needs both real songs and a gospel signal", () => {
  const gospel = channel("Sample Gospel Ministries");
  const secular = channel("Benga Classics");
  assert.equal(autoApprovable(gospel, 12), true);
  // Enough songs, but nothing says gospel.
  assert.equal(autoApprovable(secular, 12), false);
  // Says gospel, but barely any music.
  assert.equal(autoApprovable(gospel, 1), false);
});

test("discovery covers every language the picker offers", async () => {
  const { MEDIA_LANGUAGES } = await import("../src/lib/mediaDirectory.ts");
  const searched = new Set(DISCOVERY_QUERIES.flatMap((q) => q.languages));
  for (const { code, label } of MEDIA_LANGUAGES) {
    if (code === "all" || code === "other") continue;
    assert.ok(
      searched.has(code),
      `"${label}" (${code}) has a filter but no discovery query, so it would never fill.`,
    );
  }
});

test("discovery queries are gospel-specific, never bare language names", () => {
  for (const { query } of DISCOVERY_QUERIES) {
    assert.ok(
      /gospel|worship|praise|injili|ngai/i.test(query),
      `"${query}" is too broad — it would return secular channels.`,
    );
  }
});
