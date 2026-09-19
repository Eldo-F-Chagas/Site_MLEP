const CACHE_NAME = 'mlep-static-v3';
const BASE_URL = new URL('./', self.location.href);
const BASE_PATH = BASE_URL.pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith('mlep-static-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Navigation, API and authentication responses must always come from the server.
  if (request.mode === 'navigate' || url.pathname.startsWith(`${BASE_PATH}api/`)) return;

  const isStatic = url.pathname.startsWith(`${BASE_PATH}assets/`) || url.pathname.startsWith(`${BASE_PATH}i18n/`);
  if (!isStatic) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      const cached = await cache.match(request);
      return cached || Response.error();
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
