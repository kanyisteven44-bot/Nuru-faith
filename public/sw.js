const CACHE_NAME = "nuru-static-v7-offline-reading";
const PRECACHE = [
  "/offline.html",
  "/offline-reader.js",
  "/photos/mountain-lake.jpg",
  "/manifest.webmanifest",
  "/favicon.png?v=arch1",
  "/icons/icon-192.png?v=arch1",
  "/icons/icon-512.png?v=arch1",
  "/icons/maskable-512.png?v=arch1",
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

  const title = typeof payload.title === "string" ? payload.title : "Nuru Faith";
  const body = typeof payload.body === "string" ? payload.body : "";
  const id = typeof payload.id === "string" ? payload.id : "";
  const category = typeof payload.category === "string" ? payload.category : "system";
  const priority = typeof payload.priority === "string" ? payload.priority : "normal";
  const rawUrl = typeof payload.url === "string" ? payload.url : "/notifications";
  const url = rawUrl.startsWith("/") ? rawUrl : "/notifications";
  const isCall = category === "call";

  const options = {
    body,
    icon: "/icons/icon-192.png?v=arch1",
    badge: "/icons/icon-192.png?v=arch1",
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

  const target = event.notification?.data?.url || "/notifications";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          void client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
