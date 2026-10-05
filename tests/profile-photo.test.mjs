import { test } from "node:test";
import assert from "node:assert/strict";
import { profilePhotoExtension, PROFILE_PHOTO_MAX_BYTES } from "../src/lib/profilePhoto.ts";

test("profile uploads accept only bounded raster photos", () => {
  assert.equal(profilePhotoExtension({ type: "image/jpeg", size: 100 }), "jpg");
  assert.equal(profilePhotoExtension({ type: "image/png", size: PROFILE_PHOTO_MAX_BYTES }), "png");
  assert.equal(profilePhotoExtension({ type: "image/webp", size: 100 }), "webp");
  for (const file of [
    { type: "image/svg+xml", size: 100 },
    { type: "video/mp4", size: 100 },
    { type: "image/jpeg", size: 0 },
    { type: "image/jpeg", size: PROFILE_PHOTO_MAX_BYTES + 1 },
  ])
    assert.throws(() => profilePhotoExtension(file));
});
