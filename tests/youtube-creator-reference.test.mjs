import test from "node:test";
import assert from "node:assert/strict";
import { parseYouTubeCreatorReference } from "../src/lib/youtubeCreator.ts";

test("creator links resolve channel IDs, handles, usernames and videos", () => {
  assert.deepEqual(
    parseYouTubeCreatorReference("https://www.youtube.com/channel/UC1234567890123456789012"),
    { kind: "channel", id: "UC1234567890123456789012" },
  );
  assert.deepEqual(
    parseYouTubeCreatorReference("https://youtube.com/@RehemaSimfukwe"),
    { kind: "handle", handle: "RehemaSimfukwe" },
  );
  assert.deepEqual(
    parseYouTubeCreatorReference("https://youtube.com/user/legacyname"),
    { kind: "username", username: "legacyname" },
  );
  assert.deepEqual(
    parseYouTubeCreatorReference("https://youtu.be/_HJc2AHiSwI"),
    { kind: "video", id: "_HJc2AHiSwI" },
  );
  assert.deepEqual(
    parseYouTubeCreatorReference("https://youtube.com/watch?v=_HJc2AHiSwI"),
    { kind: "video", id: "_HJc2AHiSwI" },
  );
  assert.deepEqual(
    parseYouTubeCreatorReference("https://youtube.com/shorts/_HJc2AHiSwI"),
    { kind: "video", id: "_HJc2AHiSwI" },
  );
});

test("creator parser rejects unrelated and ambiguous links", () => {
  assert.equal(parseYouTubeCreatorReference("https://example.com/@artist"), null);
  assert.equal(parseYouTubeCreatorReference("https://youtube.com/c/ambiguous-custom-name"), null);
  assert.equal(parseYouTubeCreatorReference(""), null);
});
