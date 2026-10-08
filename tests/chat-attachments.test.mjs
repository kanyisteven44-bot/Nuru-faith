import test from "node:test";
import assert from "node:assert/strict";
import { chatAttachmentInfo, chatDownloadName } from "../src/lib/chatAttachments.ts";
test("documents with missing browser MIME types can be uploaded with a canonical type", () => {
  assert.equal(chatAttachmentInfo({ name: "Report.PDF", size: 20 }).mime, "application/pdf");
  assert.equal(chatAttachmentInfo({ name: "Budget.xlsx", size: 20 }).kind, "file");
  assert.equal(chatAttachmentInfo({ name: "photo.jpg", size: 20 }).kind, "image");
  assert.equal(chatAttachmentInfo({ name: "clip.mov", size: 20 }).kind, "video");
});
test("unsupported, empty and oversized files are rejected", () => {
  for (const file of [
    { name: "run.exe", size: 1 },
    { name: "empty.pdf", size: 0 },
    { name: "big.zip", size: 51 * 1024 * 1024 },
  ])
    assert.throws(() => chatAttachmentInfo(file));
});
test("downloads preserve names and support old photos without filename metadata", () => {
  assert.equal(chatDownloadName("direct/a/b/uuid.jpg", "Photo"), "nuru-attachment.jpg");
  assert.equal(chatDownloadName("group/a/b/uuid.pdf", "Weekly report.pdf"), "Weekly report.pdf");
  assert.equal(chatDownloadName("direct/a/b/uuid.docx", "C:\\files\\report.docx"), "report.docx");
  assert.equal(chatDownloadName("direct/a/b/uuid.pdf", "../../report\u0000.pdf"), "report.pdf");
});
