// GENERATED INTO public/sw.js by scripts/generateServiceWorkerShell.mjs. Edit this template, not public/sw.js.
// The values in double underscores are filled from lib/constants (the single source of truth for routes and names).
//
// Service worker: lets the app open with no connection.
// - App shell (pages, JavaScript, CSS): cached, so the screens open offline.
// - Navigations: network first, falling back to the cached copy of the page.
// - API calls (/api/*) and /health are never cached: business data is stored by the app itself in IndexedDB,
//   where the app controls what is kept and when it is removed.

const CACHE = __CACHE_NAME__;
const SHELL = __SHELL_ROUTES__;
const OFFLINE_FALLBACK = __OFFLINE_FALLBACK_ROUTE__;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        // One failed page must not stop the rest from being cached.
        Promise.all(SHELL.map((url) => cache.add(url).catch(() => undefined))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/health") return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match(OFFLINE_FALLBACK))),
    );
  }
});
