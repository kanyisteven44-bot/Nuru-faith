import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("owner profile shows a real post action, a badge and music shelf", () => {
  const screen = read("src/routes/_authenticated/profile.tsx");
  assert.match(screen, /GRID_TABS = \["Posts", "Reels", "Music", "Saved"\]/);
  assert.match(screen, /ProfileMusicFeature/);
  assert.match(screen, /ProfileMusicSection/);
  assert.match(screen, /Journey badge/);
  assert.match(screen, /to="\/create" search=\{\{ from: "profile" \}\}/);
});
test("creating a post from profile returns to the profile instead of community", () => {
  const composer = read("src/routes/_authenticated/create.tsx");
  assert.match(composer, /from: z\.literal\("profile"\)\.optional\(\)/);
  assert.match(composer, /search\.from === "profile"/);
  assert.match(composer, /navigate\(\{ to: "\/profile" \}\)/);
  assert.match(composer, /qc\.invalidateQueries\(\{ queryKey: \["my-posts", userId\] \}\)/);
});
test("public profiles can show music and signed video or photo posts", () => {
  const screen = read("src/routes/_authenticated/discovery.$kind.$id.tsx");
  assert.match(screen, /ProfileMusicSection memberId=\{id\} editable=\{isSelf\}/);
  assert.match(screen, /<PostPresentation/);
});
test("approved catalogue membership and ownership are enforced in database policies", () => {
  const sql = read("supabase/migrations/20261009030000_profile_music.sql");
  assert.match(sql, /enable row level security/);
  assert.match(sql, /user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /m\.media_type = 'music' and m\.is_approved = true/);
  assert.doesNotMatch(sql, /grant [^\n]*update/i);
});
test("the member music picker only searches approved catalog rows and supports removal", () => {
  const picker = read("src/components/nuru/ProfileMusicSection.tsx");
  const service = read("src/services/profileMusic.ts");
  const media = read("src/services/media.ts");
  assert.match(picker, /fetchMediaCatalog\(\{ mediaType: "music"/);
  assert.match(picker, /removeProfileMusic\(memberId, id\)/);
  assert.match(service, /media_items\.is_approved/);
  assert.match(media, /\.eq\("is_approved", true\)/);
});
