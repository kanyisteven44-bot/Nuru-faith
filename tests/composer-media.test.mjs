import test from "node:test";
import assert from "node:assert/strict";
import { validateComposerMedia } from "../src/lib/composerMedia.ts";
test("reels accept supported videos but reject photos, unknown types and empty files", () => {
  for (const type of ["video/mp4", "video/webm", "video/quicktime"]) assert.equal(validateComposerMedia({ type, size: 1024 }, true), null);
  for (const type of ["image/jpeg", "application/pdf", ""]) assert.ok(validateComposerMedia({ type, size: 1024 }, true));
  assert.ok(validateComposerMedia({ type: "video/mp4", size: 0 }, true));
});
test("post attachments respect the upload limit before uploading", () => {
  assert.equal(validateComposerMedia({ type: "image/jpeg", size: 50 * 1024 * 1024 }), null);
  assert.ok(validateComposerMedia({ type: "video/mp4", size: 50 * 1024 * 1024 + 1 }));
  assert.ok(validateComposerMedia({ type: "application/pdf", size: 1 }));
});
