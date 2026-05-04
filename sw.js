const SW_VERSION = 'mk-sw-7.11.0';
const RUNTIME_CACHE = `${SW_VERSION}-runtime`;

self.addEventListener('install', (event) => {
  // Aktivoi uusi SW heti
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key !== RUNTIME_CACHE)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Vain GET + same-origin
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Navigaatiot: network-first, cache fallback
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (_) {
        const cached = await caches.match(req);
        if (cached) return cached;
        return caches.match('/index.html');
      }
    })());
    return;
  }

  // JS/CSS/HTML: network-first jotta uudet muutokset näkyvät nopeasti
  if (['script', 'style', 'document'].includes(req.destination)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (_) {
        const cached = await caches.match(req);
        if (cached) return cached;
        throw _;
      }
    })());
    return;
  }

  // Muut resurssit: cache-first + taustapäivitys
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(req);
    if (cached) {
      event.waitUntil((async () => {
        try {
          const fresh = await fetch(req);
          await cache.put(req, fresh.clone());
        } catch (_) {
          // ei kriittinen
        }
      })());
      return cached;
    }

    const fresh = await fetch(req);
    await cache.put(req, fresh.clone());
    return fresh;
  })());
});
