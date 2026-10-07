/** Public reading text only. Never store sessions, profiles, notes or API responses here. */
export type OfflineReading = {
  id: string;
  kind: "bible" | "course" | "book";
  title: string;
  subtitle: string;
  sections: { title: string; text: string }[];
  savedAt: number;
};
const DB_NAME = "nuru-reading-v1";
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined")
      return reject(new Error("Offline storage is unavailable in this browser."));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("readings", { keyPath: "id" });
    request.onerror = () => reject(new Error("Could not open offline storage."));
    request.onblocked = () => reject(new Error("Close other Nuru tabs and try again."));
    request.onsuccess = () => resolve(request.result);
  });
}
export async function saveOfflineReading(reading: Omit<OfflineReading, "savedAt">) {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("readings", "readwrite");
      tx.objectStore("readings").put({ ...reading, savedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(new Error("Could not save offline. Check available device storage."));
      tx.onabort = () => reject(new Error("The offline save was interrupted."));
    });
  } finally {
    db.close();
  }
}
export async function getOfflineReading(id: string): Promise<OfflineReading | undefined> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("readings").objectStore("readings").get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("Could not read the saved download."));
    });
  } finally {
    db.close();
  }
}
export function passageText(verses: { chapter: number; verse: number; text: string }[]) {
  return verses.map((v) => `${v.chapter}:${v.verse}  ${v.text}`).join("\n\n");
}
