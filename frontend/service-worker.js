const CACHE_NAME = 'budgetiq-v3';

// ── INSTALL: skip waiting immediately ─────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing v3...');
  self.skipWaiting();
});

// ── ACTIVATE: delete ALL old caches ───────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating v3...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        console.log('[SW] Deleting cache:', key);
        return caches.delete(key);
      }))
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: always go to network first ─────────────────────────
self.addEventListener('fetch', event => {
  // Always use network — no caching
  event.respondWith(
    fetch(event.request).catch(() => {
      // Only fallback to cache if network fails
      return caches.match(event.request);
    })
  );
});