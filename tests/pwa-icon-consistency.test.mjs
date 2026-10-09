import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("installed-app, Apple touch, notification and offline icons use same current brand revision", () => {
  const manifest = JSON.parse(read("public/manifest.webmanifest"));
  const worker = read("public/sw.js");
  const root = read("src/routes/__root.tsx");
  const icons = manifest.icons.map((icon) => icon.src);
  assert.equal(icons.length, 3);
  assert.ok(icons.every((url) => url.endsWith("?v=cross2")));
  for (const icon of icons) assert.ok(worker.includes(icon), "worker should precache " + icon);
  assert.match(root, /apple-touch-icon.*icon-192\.png\?v=cross2/);
  assert.match(root, /favicon\.png\?v=cross2/);
  assert.match(worker, /favicon\.png\?v=cross2/);
  assert.match(worker, /icon-192\.png\?v=cross2/);
  assert.match(worker, /tag: id \? `nuru-\$\{id\}`/);
  assert.doesNotMatch(worker, /\?v=arch1/);
});

test("new offline worker cache revision preserves separate downloaded reading library", () => {
  const worker = read("public/sw.js");
  assert.match(worker, /nuru-static-v8-cross2-icons/);
  assert.match(worker, /key\.startsWith\("nuru-static-"\) && key !== CACHE_NAME/);
  assert.match(worker, /"\/offline\.html"/);
  assert.match(worker, /"\/offline-reader\.js"/);
  assert.match(worker, /self\.clients\.claim\(\)/);
});
