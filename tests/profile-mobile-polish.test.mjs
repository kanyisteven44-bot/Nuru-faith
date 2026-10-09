import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("real profile retains user identity and accessible social actions", () => {
  const source = read("src/routes/_authenticated/profile.tsx");
  assert.match(source, /\/photos\/worship-gathering\.jpg/);
  assert.match(source, /profile\.data\?\.avatar_url/);
  assert.match(source, /profile\.data\?\.full_name/);
  assert.match(source, /profile\.data\?\.username/);
  assert.match(source, /"Followers"/);
  assert.match(source, /"Following"/);
  assert.match(source, /setPeople\("followers"\)/);
  assert.match(source, /setPeople\("following"\)/);
  assert.match(source, /to="\/create" search=\{\{ from: "profile" \}\}/);
  assert.match(source, /to="\/settings" search=\{\{ panel: "profile" \}\}/);
  assert.match(source, /onClick=\{\(\) => photoInput\.current\?\.click\(\)\}/);
});

test("faith journey is data-driven and its editor remains functional", () => {
  const source = read("src/routes/_authenticated/profile.tsx");
  assert.match(source, /faith_streak \?\? 0/);
  assert.match(source, /Growing Disciple/);
  assert.match(source, /\/photos\/mountain-lake\.jpg/);
  assert.match(source, /Level \{level\}/);
  assert.match(source, /ProgressBar value=\{\(intoLevel \/ LEVEL_STEP\) \* 100\}/);
  assert.match(source, /await updateProfile\(userId, \{ full_name: name\.trim\(\), bio: bio\.trim\(\) \}\)/);
});

test("music feature scrolls to the functional music tab without overriding reduced motion", () => {
  const profile = read("src/routes/_authenticated/profile.tsx");
  const music = read("src/components/nuru/ProfileMusicSection.tsx");
  assert.match(profile, /onBrowse=\{openMusicTab\}/);
  assert.match(profile, /setTab\("Music"\)/);
  assert.match(profile, /contentTabsRef\.current\?\.scrollIntoView/);
  assert.match(profile, /prefers-reduced-motion: reduce/);
  assert.match(profile, /<ProfileMusicSection memberId=\{userId!\} editable/);
  assert.match(music, /onClick=\{onBrowse\}/);
  assert.match(music, /setPlaying\(featured\)/);
  assert.match(music, /fetchMediaCatalog\(\{ mediaType: "music"/);
});

test("posts use a single menu, preserve preview and confirmed post deletion", () => {
  const profile = read("src/routes/_authenticated/profile.tsx");
  assert.match(profile, /<DropdownMenuTrigger asChild>/);
  assert.match(profile, /Options for post:/);
  assert.match(profile, /<DropdownMenuItem/);
  assert.match(profile, /aria-label=\{\x60Delete post:/);
  assert.match(profile, /onSelect=\{\(\) => setPostToDelete/);
  assert.match(profile, /confirmDeletePost/);
  assert.match(profile, /Delete permanently/);
  assert.match(profile, /<PostPresentation/);
  assert.doesNotMatch(profile, /aria-label="Create another post"/);
});

test("saved library only appears in Saved tab and unnecessary queries stay dormant", () => {
  const profile = read("src/routes/_authenticated/profile.tsx");
  assert.match(profile, /tab === "Saved" && \(\s*<section/);
  assert.match(profile, /Your saved library/);
  assert.match(profile, /Bible verses/);
  assert.match(profile, /Highlights/);
  assert.match(profile, /Saved posts/);
  assert.match(profile, /Events/);
  for (const action of ["fetchMyEventIds", "fetchSavedScriptures", "fetchAllHighlights", "fetchMySavedPostRows"]) {
    const match = profile.match(new RegExp("queryFn: \\(\\) => " + action + "\\(userId!\\),\\s*enabled: ([^,]+),"));
    assert.ok(match, action + " query exists");
    assert.equal(match[1], '!!userId && tab === "Saved"', action + " must load only on Saved tab");
  }
});
