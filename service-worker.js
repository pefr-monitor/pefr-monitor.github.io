const CACHE = "pefr-v2-7-fast-update";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./pefr-measurement-guide.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;

  // HTML/navigation: show cache immediately, update it quietly in background.
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      caches.match("./index.html").then(cached => {
        const refresh = fetch("./index.html", {cache:"no-store"})
          .then(response => {
            if (response && response.ok) {
              caches.open(CACHE).then(cache => cache.put("./index.html", response.clone()));
            }
            return response;
          })
          .catch(() => null);

        if (cached) {
          event.waitUntil(refresh);
          return cached;
        }
        return refresh.then(r => r || caches.match("./"));
      })
    );
    return;
  }

  // Static assets: cache first; refresh when absent.
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
      }
      return response;
    }))
  );
});
