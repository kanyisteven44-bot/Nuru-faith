import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AFRICAN_CLOUD_VOICES, cloudVoicesForBibleLocale, escapeSpeechXml } from "../src/lib/africanCloudVoices.ts";
const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
test("verified African voices match exact locale", () => {
  for (const locale of ["sw-KE", "sw-TZ", "am-ET", "so-SO", "af-ZA", "zu-ZA"]) {
    const v = cloudVoicesForBibleLocale(locale);
    assert.equal(v.length, 2, locale);
    assert.ok(v.every(x => x.voice.startsWith(locale + "-")));
  }
  for (const unsupported of ["ki-KE", "luo-KE", "kam-KE", "lg-UG", "sw-CD", "sw-UG", "pga-SS"])
    assert.deepEqual(cloudVoicesForBibleLocale(unsupported), [], unsupported);
  assert.equal(AFRICAN_CLOUD_VOICES.length, 12);
  assert.equal(new Set(AFRICAN_CLOUD_VOICES.map(v=>v.voice)).size, 12);
});
test("SSML escapes unsafe Scripture characters", () => {
  assert.equal(escapeSpeechXml("Faith & <love> \"God\" 'hope'"),
    "Faith &amp; &lt;love&gt; &quot;God&quot; &apos;hope&apos;");
});
test("paid cloud requires explicit provider opt-in, validated login, rate limit", () => {
  const s = read("src/lib/africanBibleAudio.functions.ts");
  for (const term of ["NURU_CLOUD_TTS_ENABLED","AZURE_SPEECH_KEY","AZURE_SPEECH_REGION","requireSupabaseAuth","enforceNuruRateLimit","escapeSpeechXml(data.text)"])
    assert.ok(s.includes(term), term);
  assert.match(s, /\.max\(280\)/);
  assert.match(s, /AFRICAN_CLOUD_VOICES\.find/);
  assert.match(s, /AbortSignal\.timeout\(12_000\)/);
  assert.doesNotMatch(s, /console\.log\(.+SPEECH_KEY/);
});
test("on-demand audio player has controls and never auto-bills on mount", () => {
  const s = read("src/components/nuru/AfricanCloudBibleAudio.tsx");
  const b = read("src/components/nuru/BibleReadAloud.tsx");
  assert.ok(b.includes("<AfricanCloudBibleAudio"));
  for (const term of ["getAfricanCloudAudioStatus", "synthesizeAfricanBibleAudio", "next.onended", "next.play()", "Stop cloud voice", "token.current++", "availability.data?.enabled"])
    assert.ok(s.includes(term), term);
});
