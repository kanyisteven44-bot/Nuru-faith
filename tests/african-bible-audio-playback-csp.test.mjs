import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("Nuru cloud audio uses CSP-allowed temporary blob URLs, not blocked data URLs", () => {
  const player = read("src/components/nuru/AfricanCloudBibleAudio.tsx");
  const vercel = JSON.parse(read("vercel.json"));
  const csp = vercel.headers.flatMap((rule) => rule.headers)
    .find((header) => header.key === "Content-Security-Policy")?.value;
  assert.ok(csp);
  assert.match(csp, /media-src 'self' blob: https:/);
  assert.doesNotMatch(csp, /media-src[^;]*data:/);
  assert.match(player, /URL\.createObjectURL\(new Blob\(\[bytes\]/);
  assert.match(player, /URL\.revokeObjectURL\(audioBlobUrl\.current\)/);
  assert.match(player, /new Audio\(blobUrl\)/);
  assert.doesNotMatch(player, /new Audio\("data:/);
  assert.match(player, /audio\.current\.removeAttribute\("src"\)/);
  assert.match(player, /audio\.current\.onended = null/);
});

test("audio is cancelled and cleaned between segments, on stop, and unmount", () => {
  const player = read("src/components/nuru/AfricanCloudBibleAudio.tsx");
  assert.match(player, /const audioBlobUrl = useRef<string \| null>\(null\)/);
  assert.match(player, /function releaseAudio\(\)/);
  assert.match(player, /audio\.current\.pause\(\)/);
  assert.match(player, /releaseAudio\(\);\s*\}, \[language, verses\]\)/);
  assert.match(player, /function stop\(\) \{[\s\S]*?releaseAudio\(\)/);
  assert.match(player, /next\.onended = \(\) => \{[\s\S]*?releaseAudio\(\);/);
  assert.match(player, /token\.current\+\+/);
});

test("audio requests remain bounded but make fewer roundtrips per Bible chapter", () => {
  const ui = read("src/components/nuru/AfricanCloudBibleAudio.tsx");
  const server = read("src/lib/africanBibleAudio.functions.ts");
  assert.match(ui, /bibleSpeechChunks\(v\.text, 255\)/);
  assert.match(server, /\.max\(280\)/);
  assert.match(server, /NURU_CLOUD_TTS_ENABLED/);
  assert.match(server, /requireSupabaseAuth/);
  assert.match(server, /enforceNuruRateLimit/);
});
