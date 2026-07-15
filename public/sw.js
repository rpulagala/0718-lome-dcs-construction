/* DCS Construction client-app service worker — install + offline app shell. */
const CACHE = "dcs-portal-v2";
const SHELL = ["/app", "/app/signin", "/icon-192.png", "/icon-512.png"];
const OFFLINE_HTML =
  "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>" +
  "<title>Offline</title><style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;" +
  "min-height:100vh;margin:0;background:#0a0a0a;color:#e2e8f0;text-align:center;padding:2rem}h1{font-size:1.1rem}" +
  "p{color:#94a3b8;font-size:.9rem}</style><h1>You're offline</h1>" +
  "<p>Reconnect to load your DCS Construction app.</p>";

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

  // Navigations: network first, fall back to the cached app shell, then an
  // inline offline page when nothing is cached yet.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        const shell = await caches.match("/app");
        return (
          shell ||
          new Response(OFFLINE_HTML, { headers: { "content-type": "text/html; charset=utf-8" } })
        );
      })
    );
    return;
  }
  // Static assets: cache first.
  if (["style", "script", "image", "font"].includes(req.destination)) {
    event.respondWith(caches.match(req).then((c) => c || fetch(req)));
  }
});
