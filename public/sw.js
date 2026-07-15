/* DCS Construction client-app service worker — install + offline app shell. */
const CACHE = "dcs-portal-v1";
const SHELL = ["/app", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Navigations: network first, fall back to the cached app shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/app")));
    return;
  }
  // Static assets: cache first.
  if (["style", "script", "image", "font"].includes(req.destination)) {
    event.respondWith(caches.match(req).then((c) => c || fetch(req)));
  }
});
