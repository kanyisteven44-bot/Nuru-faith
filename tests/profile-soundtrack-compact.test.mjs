import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/components/nuru/ProfileMusicSection.tsx", import.meta.url), "utf8");
const component = source.split("export function ProfileMusicFeature(")[1]?.split("function MusicArtwork(")[0];

test("owner soundtrack is one compact row with no second large nested card", () => {
  assert.ok(component);
  assert.match(component, /min-h-\[64px\]/);
  assert.match(component, /px-3 py-2/);
  assert.match(component, /My profile soundtrack/);
  assert.match(component, /Add a worship song/);
  assert.doesNotMatch(component, /mt-2\.5 flex min-h-12 w-full.*border.*bg-white/);
  assert.doesNotMatch(component, /h-14 w-14 shrink-0/);
});

test("both songless and featured states retain real profile-music actions", () => {
  assert.match(component, /queryKey: \["profile-music", memberId\]/);
  assert.match(component, /queryFn: \(\) => fetchProfileMusic\(memberId\)/);
  assert.match(component, /onClick=\{onBrowse\}/);
  assert.match(component, /aria-label="Manage my profile soundtrack"/);
  assert.match(component, /onClick=\{\(\) => setPlaying\(featured\)\}/);
  assert.match(component, /ProfileMediaPlayback item=\{playing\}/);
  assert.match(component, /songs\.isLoading/);
});
