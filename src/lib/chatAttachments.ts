const types: Record<string, { mime: string; kind: "image" | "video" | "file" }> = {
  jpg: { mime: "image/jpeg", kind: "image" },
  jpeg: { mime: "image/jpeg", kind: "image" },
  png: { mime: "image/png", kind: "image" },
  webp: { mime: "image/webp", kind: "image" },
  gif: { mime: "image/gif", kind: "image" },
  mp4: { mime: "video/mp4", kind: "video" },
  webm: { mime: "video/webm", kind: "video" },
  mov: { mime: "video/quicktime", kind: "video" },
  pdf: { mime: "application/pdf", kind: "file" },
  txt: { mime: "text/plain", kind: "file" },
  csv: { mime: "text/csv", kind: "file" },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    kind: "file",
  },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", kind: "file" },
  pptx: {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    kind: "file",
  },
  zip: { mime: "application/zip", kind: "file" },
};
export const CHAT_DOCUMENT_ACCEPT = ".pdf,.txt,.csv,.docx,.xlsx,.pptx,.zip";

export function chatAttachmentInfo(file: { name: string; size: number }) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const info = types[extension];
  if (!info) throw new Error("Choose a photo, video, PDF, text, Office document or ZIP file.");
  if (!file.size) throw new Error("This file is empty.");
  if (file.size > 50 * 1024 * 1024) throw new Error("Choose a file smaller than 50 MB.");
  return { ...info, extension };
}

export function chatDownloadName(path: string, original?: string): string {
  const extension =
    path
      .split(".")
      .pop()
      ?.replace(/[^a-z0-9]/gi, "") || "bin";
  const name = original
    ?.split(/[\\/]/)
    .pop()
    ?.split("")
    .filter((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127)
    .join("")
    .replace(/[<>:"|?*]/g, "")
    .trim();
  return name && name.includes(".") ? name.slice(0, 180) : `nuru-attachment.${extension}`;
}
