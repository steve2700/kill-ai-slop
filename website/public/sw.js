/* Kill AI Slop service worker.
 *
 * No build integration: the site stays dependency-free, so this file is plain
 * and hand-written. Strategy:
 *   - install:  fetch "/" and precache it plus every /_astro/ asset it names,
 *               so the whole single-page guide works offline after one visit.
 *   - /_astro/: cache-first (filenames are content-hashed, so never stale).
 *   - pages:    network-first, falling back to the cached copy when offline.
 *   - other:    stale-while-revalidate (icons, demo images).
 * Bump VERSION to drop old caches on the next deploy.
 */
const VERSION = "v2";
const CACHE = "kas-" + VERSION;
const CORE = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/demo/clean-icon.png",
  "/demo/sample-glossy.jpg",
  "/demo/sample-printed.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(CORE);
      // Discover the hashed CSS/JS the home page needs and precache them too.
      try {
        const html = await (await fetch("/", { cache: "reload" })).text();
        const urls = new Set();
        for (const m of html.matchAll(/(?:href|src)="(\/_astro\/[^"]+)"/g)) urls.add(m[1]);
        await Promise.all([...urls].map((u) => cache.add(u).catch(() => {})));
      } catch (e) {}
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("kas-") && k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Hashed build assets: cache-first.
  if (url.pathname.startsWith("/_astro/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Page loads: network-first, offline falls back to the cached home page.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("/", copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/"))),
    );
    return;
  }

  // Everything else: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((hit) => {
      const refresh = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || refresh;
    }),
  );
});
