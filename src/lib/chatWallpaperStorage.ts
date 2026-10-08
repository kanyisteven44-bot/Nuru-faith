export function validateChatWallpaper(file: Pick<File, "type" | "size">) {
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type))
    throw new Error("Choose a JPG, PNG, WebP or GIF photo.");
  if (!file.size || file.size > 10 * 1024 * 1024)
    throw new Error("Choose a photo between 1 byte and 10 MB.");
}

function openWallpapers(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("nuru-chat-wallpapers-v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("photos");
    request.onerror = () => reject(new Error("Photo storage is unavailable on this device."));
    request.onblocked = () => reject(new Error("Close other Nuru tabs and try again."));
    request.onsuccess = () => resolve(request.result);
  });
}
export async function loadChatWallpaper(key: string): Promise<Blob | null> {
  const db = await openWallpapers();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("photos", "readonly");
    const request = tx.objectStore("photos").get(key);
    tx.oncomplete = () => {
      db.close();
      resolve(request.result instanceof Blob ? request.result : null);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(new Error("Couldn't load your background photo."));
    };
  });
}
export async function saveChatWallpaper(key: string, file: File): Promise<void> {
  validateChatWallpaper(file);
  const db = await openWallpapers();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").put(file, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(new Error("Couldn't save the photo. Free some device storage and retry."));
    };
  });
}
