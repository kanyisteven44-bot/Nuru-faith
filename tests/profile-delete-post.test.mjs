import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const get = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("profile post grid and preview both offer a confirmation before deletion", () => {
  const profile = get("src/routes/_authenticated/profile.tsx");
  assert.match(profile, /aria-label=\{`Delete post:/);
  assert.match(profile, /<AlertDialog/);
  assert.match(profile, /open=\{!!postToDelete\}/);
  assert.match(profile, /Delete this post\?/);
  assert.match(profile, /Keep post/);
  assert.match(profile, /Delete permanently/);
  assert.match(profile, /onClick=\{\(\) => void confirmDeletePost\(\)\}/);
  assert.match(profile, /disabled=\{deletingPost\}/);
  assert.match(profile, /tab === "Posts" && selectedItem/);
});

test("deletion is scoped to signed-in author and returns an affected row", () => {
  const content = get("src/services/content.ts");
  const code = content.split("export async function deleteOwnPost(")[1]?.split("export async function fetchProfileCounts(")[0];
  assert.ok(code, "deleteOwnPost must exist");
  assert.match(code, /\.from\("posts"\)/);
  assert.match(code, /\.delete\(\)/);
  assert.match(code, /\.eq\("id", postId\)/);
  assert.match(code, /\.eq\("author_id", authorId\)/);
  assert.match(code, /\.select\("id, media_url"\)/);
  assert.match(code, /\.maybeSingle\(\)/);
  assert.match(code, /if \(!deleted\) throw new Error/);
});

test("post media cleanup only targets member-owned uploaded media after deletion", () => {
  const content = get("src/services/content.ts");
  const code = content.split("export async function deleteOwnPost(")[1]?.split("export async function fetchProfileCounts(")[0];
  assert.ok(code);
  assert.ok(code.indexOf('.delete()') < code.indexOf('storage.from("post-media").remove'));
  assert.match(code, /folder === authorId/);
  assert.match(code, /mediaUrl\.startsWith\("post:"\)/);
  assert.match(code, /mediaCleanupFailed/);
});

test("deleting a post refreshes public feeds, own posts and profile counts", () => {
  const profile = get("src/routes/_authenticated/profile.tsx");
  assert.match(profile, /await deleteOwnPost\(userId, postToDelete\.id\)/);
  for (const key of ["my-posts", "profile-counts", "posts", "public-profile-posts", "saved-post-rows-count", "saved-posts", "post-likes", "comments"]) {
    assert.ok(profile.includes(`queryKey: ["${key}"`), `Expected cache refresh for ${key}`);
  }
  assert.match(profile, /toast\.success\("Post deleted"\)/);
});
