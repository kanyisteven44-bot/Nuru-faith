import { strict as assert } from "node:assert";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

function runCheck() {
  try {
    return {
      ok: true,
      output: execFileSync("node", ["scripts/generate-music-seed.mjs", "--check"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    };
  } catch (error) {
    return { ok: false, output: `${error.stdout ?? ""}${error.stderr ?? ""}` };
  }
}

test("the committed seed matches the reviewed source list", () => {
  const result = runCheck();
  assert.ok(
    result.ok,
    `supabase/seeds/multilingual_sources.sql has drifted from ` +
      `content/media-source-review.json. Run: node scripts/generate-music-seed.mjs\n${result.output}`,
  );
});

test("every reviewed source carries proof it was checked against a real channel", async () => {
  const reviewed = JSON.parse(await readFile("content/media-source-review.json", "utf8"));
  assert.ok(reviewed.length > 0, "the reviewed list is empty");
  for (const row of reviewed) {
    assert.match(
      row.youtube_channel_id,
      /^UC[\w-]{22}$/,
      `${row.name} has a malformed channel id: ${row.youtube_channel_id}`,
    );
    assert.ok(
      row.verification_url.endsWith(row.youtube_channel_id),
      `${row.name}: verification_url does not point at its own channel`,
    );
    assert.match(row.verified_at, /^\d{4}-\d{2}-\d{2}$/, `${row.name}: no verified_at date`);
    assert.match(
      row.sample_video_id,
      /^[\w-]{11}$/,
      `${row.name}: sample_video_id is not a video id`,
    );
    assert.ok(row.sample_title?.length, `${row.name}: no sample_title`);
    assert.ok(row.language_codes?.length, `${row.name}: no language_codes`);
  }
});

test("no artist is listed under two channel ids", async () => {
  const reviewed = JSON.parse(await readFile("content/media-source-review.json", "utf8"));
  const byChannel = new Map();
  for (const row of reviewed) {
    assert.ok(
      !byChannel.has(row.youtube_channel_id),
      `${row.youtube_channel_id} appears twice: "${byChannel.get(row.youtube_channel_id)}" and "${row.name}"`,
    );
    byChannel.set(row.youtube_channel_id, row.name);
  }
});

test("candidate names are plain data, with no channel ids guessed in advance", async () => {
  const file = JSON.parse(await readFile("content/music-source-candidates.json", "utf8"));
  assert.ok(file.candidates.length > 0, "no candidates listed");
  for (const candidate of file.candidates) {
    assert.ok(candidate.name?.length, "a candidate has no name");
    assert.ok(candidate.languages?.length, `${candidate.name}: no languages`);
    // A candidate must never carry a channel id — resolving one is the
    // script's job, against the live API, or it does not get added at all.
    assert.equal(
      "youtube_channel_id" in candidate,
      false,
      `${candidate.name}: candidates must not pre-declare a channel id`,
    );
    assert.ok(candidate.note?.length, `${candidate.name}: no note saying where the name came from`);
  }
});

test("artists who left gospel music are not quietly re-added", async () => {
  const file = JSON.parse(await readFile("content/music-source-candidates.json", "utf8"));
  assert.ok(file.excluded?.length, "the excluded list is missing");

  // Each excluded entry may name several artists in one line.
  const barred = file.excluded
    .flatMap((e) => e.name.split(",").map((n) => n.trim().toLowerCase()))
    .filter(Boolean);
  for (const entry of file.excluded) {
    assert.ok(entry.reason?.length, `${entry.name}: excluded with no reason given`);
  }

  for (const candidate of file.candidates) {
    assert.ok(
      !barred.includes(candidate.name.toLowerCase()),
      `${candidate.name} is on the excluded list — see 'excluded' for why. ` +
        `Importing a secular artist's channel would pull non-worship releases ` +
        `into the catalogue.`,
    );
  }
});

test("every candidate language has a filter users can reach it by", async () => {
  const file = JSON.parse(await readFile("content/music-source-candidates.json", "utf8"));
  const { MEDIA_LANGUAGES } = await import("../src/lib/mediaDirectory.ts");
  const offered = new Set(MEDIA_LANGUAGES.map((l) => l.code));
  for (const candidate of file.candidates) {
    for (const code of candidate.languages) {
      assert.ok(
        offered.has(code),
        `${candidate.name} is tagged "${code}", which MEDIA_LANGUAGES does not offer — ` +
          `the artist would be unreachable except under "Other languages".`,
      );
    }
  }
});

test("a language is only offered where an artist was actually found", async () => {
  const file = JSON.parse(await readFile("content/music-source-candidates.json", "utf8"));
  const { MEDIA_LANGUAGES } = await import("../src/lib/mediaDirectory.ts");
  const reviewed = JSON.parse(await readFile("content/media-source-review.json", "utf8"));

  const covered = new Set([
    ...file.candidates.flatMap((c) => c.languages),
    ...reviewed.flatMap((r) => r.language_codes ?? []),
  ]);
  for (const { code, label } of MEDIA_LANGUAGES) {
    if (code === "all" || code === "other") continue;
    assert.ok(
      covered.has(code),
      `"${label}" (${code}) is offered as a filter but no candidate or reviewed ` +
        `artist records in it, so the filter would always be empty.`,
    );
  }
});
