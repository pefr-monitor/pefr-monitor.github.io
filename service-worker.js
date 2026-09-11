const CACHE = "pefr-v2-6-network-first";
const ASSETS = [
  "./",
  "./manifest.webmanifest",
  "./pefr-measurement-guide.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;

  // HTML/navigation: always try the network first so app updates appear immediately.
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // Other static assets: cache first, then network.
  event.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
        return response;
      })
    )
  );
});
