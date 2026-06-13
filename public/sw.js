const STATIC_CACHE = "clown-army-static-v1";
const RUNTIME_CACHE = "clown-army-runtime-v1";
const CORE_ASSETS = [
  "/manifest.webmanifest",
  "/clown-army-logo.jpg",
  "/apple-icon.png",
  "/assets/URLsplash.webp",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(CORE_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font" ||
    request.destination === "image";

  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      const cached = await cache.match(request);

      if (cached) {
        void fetch(request)
          .then((response) => {
            if (response.ok) {
              void cache.put(request, response.clone());
            }
          })
          .catch(() => undefined);

        return cached;
      }

      const response = await fetch(request);

      if (response.ok) {
        void cache.put(request, response.clone());
      }

      return response;
    }),
  );
});
