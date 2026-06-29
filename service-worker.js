const APP_VERSION = '2026.06.29.4';
const CACHE_PREFIX = 'gf-erp-cache-';
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}`;
const APP_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/vendor/chart.umd.js',
  '/manifest.webmanifest',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];
const NETWORK_FIRST_PATHS = new Set([
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/vendor/chart.umd.js',
  '/manifest.webmanifest'
]);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(
      APP_ASSETS.map(url => new Request(url, { cache: 'reload' }))
    ))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.startsWith('/api/') || requestUrl.pathname === '/ws') {
    return;
  }

  if (event.request.mode === 'navigate' || NETWORK_FIRST_PATHS.has(requestUrl.pathname)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || cache.match('/index.html');
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}
