const CACHE_NAME = "nuru-static-v8-cross2-icons";

// Never navigate a notification tap to another origin, including protocol-
// relative URLs or backslash variants that URL parsing could reinterpret.
function notificationPath(raw) {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return "/notifications";
  }
  try {
    const url = new URL(raw, self.location.origin);
    if (url.origin !== self.location.origin) return "/notifications";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/notifications";
  }
}
const PRECACHE = [
  "/offline.html",
  "/offline-reader.js",
  "/photos/mountain-lake.jpg",
  "/manifest.webmanifest",
  "/favicon.png?v=cross2",
  "/icons/icon-192.png?v=cross2",
  "/icons/icon-512.png?v=cross2",
  "/icons/maskable-512.png?v=cross2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("nuru-static-") && key !== CACHE_NAME)
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      Promise.race([
        fetch(request),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Navigation timeout")), 5000)),
      ]).catch(async () => {
        const fallback = await caches.match("/offline.html");
        return fallback || Response.error();
      }),
    );
    return;
  }

  // The standalone reader is public and tiny. Refresh it online, reuse offline.
  if (url.pathname === "/offline-reader.js") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || Response.error()),
    );
    return;
  }

  const cacheable =
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font" ||
    request.destination === "image" ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest";

  if (!cacheable) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) payload = {};

  const title = typeof payload.title === "string" ? payload.title : "Nuru Faith";
  const body = typeof payload.body === "string" ? payload.body : "";
  const id = typeof payload.id === "string" ? payload.id : "";
  const category = typeof payload.category === "string" ? payload.category : "system";
  const priority = typeof payload.priority === "string" ? payload.priority : "normal";
  const url = notificationPath(payload.url);
  const isCall = category === "call";

  const options = {
    body,
    icon: "/icons/icon-192.png?v=cross2",
    badge: "/icons/icon-192.png?v=cross2",
    tag: id ? `nuru-${id}` : undefined,
    data: { url, category },
    requireInteraction: isCall || priority === "critical",
    renotify: isCall,
    vibrate: isCall ? [350, 180, 350, 180, 600] : [180],
  };

  if (isCall) {
    options.actions = [
      { action: "answer", title: "Open call" },
      { action: "dismiss", title: "Dismiss" },
    ];
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const target = notificationPath(event.notification?.data?.url);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const fullUrl = new URL(target, self.location.origin).href;

    // Reuse a live installed-app window whenever possible. Prefer a window
    // that is already on the exact destination, and otherwise WAIT for
    // navigation to finish before focusing the window.
    const alreadyThere = windows.find((client) => client.url === fullUrl);
    if (alreadyThere && "focus" in alreadyThere) {
      try {
        await alreadyThere.focus();
        return;
      } catch {
        // The window may have closed; fall through to another client.
      }
    }

    for (const client of windows) {
      if (!("navigate" in client) || !("focus" in client)) continue;
      try {
        const navigated = await client.navigate(target);
        if (navigated && "focus" in navigated) {
          await navigated.focus();
          return;
        }
      } catch {
        // A stale browser tab should never swallow the incoming-call tap.
      }
    }

    const opened = await self.clients.openWindow(target);
    if (opened && "focus" in opened) await opened.focus();
  })());
});
