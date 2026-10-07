import test from "node:test";
import assert from "node:assert/strict";
import {
  youtubeRatingRequest,
  youtubeCommentRequest,
  YouTubeConnectionRequired,
} from "../src/lib/youtubeRatingClient.ts";
test("YouTube likes and unlikes call the authenticated rating endpoint", async () => {
  for (const rating of ["like", "none"]) {
    const result = await youtubeRatingRequest(
      "abcdefghijk",
      "fixture-provider-token",
      rating,
      async (url, options) => {
        assert.equal(
          url,
          `https://www.googleapis.com/youtube/v3/videos/rate?id=abcdefghijk&rating=${rating}`,
        );
        assert.equal(options.method, "POST");
        assert.equal(options.headers.Authorization, "Bearer fixture-provider-token");
        return new Response(null, { status: 204 });
      },
    );
    assert.equal(result, rating);
  }
});
test("missing consent and expired credentials never pretend a like succeeded", async () => {
  await assert.rejects(
    youtubeRatingRequest("abcdefghijk", null, "like", () => {
      throw new Error("must not call");
    }),
    YouTubeConnectionRequired,
  );
  await assert.rejects(
    youtubeRatingRequest(
      "abcdefghijk",
      "fixture-provider-token",
      "like",
      async () => new Response(null, { status: 401 }),
    ),
    YouTubeConnectionRequired,
  );
  await assert.rejects(
    youtubeRatingRequest("abcdefghijk", "fixture-provider-token", "like", async () =>
      Response.json(
        { error: { errors: [{ reason: "insufficientPermissions" }] } },
        { status: 403 },
      ),
    ),
    YouTubeConnectionRequired,
  );
});
test("rating reads use the actual YouTube account state and API failures reject", async () => {
  assert.equal(
    await youtubeRatingRequest("abcdefghijk", "fixture-provider-token", undefined, async () =>
      Response.json({ items: [{ rating: "like" }] }),
    ),
    "like",
  );
  await assert.rejects(
    youtubeRatingRequest(
      "abcdefghijk",
      "fixture-provider-token",
      "like",
      async () => new Response(null, { status: 500 }),
    ),
    /could not update/,
  );
});

test("comments publish to YouTube with the selected account and exact submitted text", async () => {
  const result = await youtubeCommentRequest(
    "abcdefghijk",
    "UCabcdefghijklmnopqrstuv",
    "  A song of hope  ",
    "fixture-provider-token",
    async (url, options) => {
      assert.equal(url, "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet");
      assert.equal(options.method, "POST");
      assert.equal(options.headers.Authorization, "Bearer fixture-provider-token");
      assert.deepEqual(JSON.parse(options.body), {
        snippet: {
          channelId: "UCabcdefghijklmnopqrstuv",
          videoId: "abcdefghijk",
          topLevelComment: { snippet: { textOriginal: "A song of hope" } },
        },
      });
      return Response.json({ id: "real-comment" });
    },
  );
  assert.equal(result.id, "real-comment");
});
test("comments reject absent authorization and disabled comments without fake success", async () => {
  await assert.rejects(
    youtubeCommentRequest("abcdefghijk", "UCabcdefghijklmnopqrstuv", "hello", null),
    YouTubeConnectionRequired,
  );
  await assert.rejects(
    youtubeCommentRequest("abcdefghijk", "UCabcdefghijklmnopqrstuv", "hello", "fixture", async () =>
      Response.json({ error: { errors: [{ reason: "commentsDisabled" }] } }, { status: 403 }),
    ),
    /turned off/,
  );
  await assert.rejects(
    youtubeCommentRequest("abcdefghijk", "UCabcdefghijklmnopqrstuv", " ", "fixture", () => {
      throw Error("must not publish");
    }),
    /Enter a comment/,
  );
});
