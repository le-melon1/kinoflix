// --- KINOFLIX SERVICE WORKER (PWA) ---
const CACHE_NAME = 'kinoflix-shell-v4';

self.addEventListener('install', (event) => {
  // Skip waiting immediately to replace any stale service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete all old cache stores to ensure fresh assets
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass cache completely for stream endpoints
  if (
    url.pathname.startsWith('/api/stream') ||
    url.pathname.startsWith('/stream') ||
    url.pathname.startsWith('/api/downloads/play')
  ) {
    return;
  }

  // Network-first policy for all assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
