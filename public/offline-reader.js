/* Standalone reading room: no account, API, font, image or app-bundle dependency. */
const list = document.querySelector("#list");
const reader = document.querySelector("#reader");
const status = document.querySelector("#status");
const filter = document.querySelector("#filter");
let entries = [];
let current = null;
let section = 0;
let db;
function el(tag, text, parent) {
  const node = document.createElement(tag);
  node.textContent = text;
  parent?.append(node);
  return node;
}
function action(label, handler, parent) {
  const button = el("button", label, parent);
  button.type = "button";
  button.onclick = handler;
  return button;
}
function showList() {
  current = null;
  reader.hidden = true;
  list.hidden = false;
  list.replaceChildren();
  const selected = entries.filter(
    (e) =>
      (!filter.value || e.kind === filter.value) &&
      (e.title + " " + e.subtitle)
        .toLowerCase()
        .includes(document.querySelector("#search").value.toLowerCase()),
  );
  if (!selected.length)
    el(
      "p",
      entries.length
        ? "No matching saved readings."
        : "No readings saved yet. While online, open a Bible chapter, course or book and tap Save for offline.",
      list,
    );
  for (const entry of selected) {
    const card = el("article", "", list);
    el("span", entry.kind.toUpperCase(), card);
    el("h2", entry.title, card);
    el("p", entry.subtitle, card);
    el(
      "p",
      `${entry.sections.length} reading sections · Saved ${new Date(entry.savedAt).toLocaleDateString()}`,
      card,
    );
    action(
      "Read",
      () => {
        current = entry;
        try {
          section = Math.max(
            0,
            Math.min(
              entry.sections.length - 1,
              Number(localStorage.getItem("nuru-offline-position:" + entry.id)) || 0,
            ),
          );
        } catch {
          section = 0;
        }
        showReader();
      },
      card,
    );
    action(
      "Remove download",
      async () => {
        const tx = db.transaction("readings", "readwrite");
        tx.objectStore("readings").delete(entry.id);
        tx.oncomplete = () => {
          entries = entries.filter((e) => e.id !== entry.id);
          showList();
        };
        tx.onerror = () => {
          status.textContent = "Could not remove this download.";
        };
      },
      card,
    );
  }
}
function showReader() {
  list.hidden = true;
  reader.hidden = false;
  reader.replaceChildren();
  action("← Saved readings", showList, reader);
  el("h1", current.title, reader);
  el("p", current.subtitle, reader);
  const nav = el("nav", "", reader);
  nav.setAttribute("aria-label", "Reading sections");
  const prev = action(
    "← Previous",
    () => {
      section--;
      showReader();
    },
    nav,
  );
  prev.disabled = section === 0;
  el("span", `${section + 1} / ${current.sections.length}`, nav);
  const next = action(
    "Next →",
    () => {
      section++;
      showReader();
    },
    nav,
  );
  next.disabled = section >= current.sections.length - 1;
  const size = action(
    "Larger text",
    () => {
      reader.classList.toggle("large");
    },
    nav,
  );
  size.setAttribute("aria-label", "Toggle larger reading text");
  el("h2", current.sections[section].title, reader);
  const text = el("div", current.sections[section].text, reader);
  text.className = "reading-text";
  try {
    localStorage.setItem("nuru-offline-position:" + current.id, String(section));
  } catch {
    /* Reading still works. */
  }
  window.scrollTo(0, 0);
}
function connectivity() {
  status.textContent = navigator.onLine
    ? "Your saved readings are ready. Downloads stay on this device."
    : "Offline · Your saved readings are ready. Music, Reels and syncing need internet.";
}
window.addEventListener("online", connectivity);
window.addEventListener("offline", connectivity);
filter.onchange = showList;
document.querySelector("#search").oninput = showList;
connectivity();
const request = indexedDB.open("nuru-reading-v1", 1);
request.onupgradeneeded = () => request.result.createObjectStore("readings", { keyPath: "id" });
request.onerror = () => {
  status.textContent =
    "Device storage is unavailable. Try a regular browser tab with storage enabled.";
};
request.onsuccess = () => {
  db = request.result;
  const all = db.transaction("readings").objectStore("readings").getAll();
  all.onsuccess = () => {
    entries = all.result.sort((a, b) => b.savedAt - a.savedAt);
    showList();
  };
  all.onerror = () => {
    status.textContent = "Could not read saved downloads.";
  };
};
if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => {});
