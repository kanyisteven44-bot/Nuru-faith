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
  }
});
