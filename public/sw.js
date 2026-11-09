/* Versioned, same-origin shell/static cache. Never caches form, auth, or database traffic. */
const CACHE_NAME = 'legion-portfolio-shell-v15';
const SHELL_URLS = [
  '/',
  '/robots.txt',
  '/sitemap.xml',
  '/site.webmanifest?v=20261109-3',
  '/og-card.png',
  '/favicon.svg?v=20261109-3',
  '/favicon-32.png?v=20261109-3',
  '/favicon.ico?v=20261109-3',
];
const API_PREFIXES = ['/rest/v1/', '/auth/v1/', '/functions/v1/', '/storage/v1/'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('legion-portfolio-') && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'PORTFOLIO_SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (API_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/', response.clone());
        }
        return response;
      } catch {
        return (await caches.match('/')) || Response.error();
      }
    })());
    return;
  }

  const isStaticAsset = url.pathname.startsWith('/assets/')
    || url.pathname.startsWith('/profile/')
    || /\.(?:css|js|mjs|svg|png|jpe?g|webp|woff2?|xml|webmanifest|txt|ico)$/i.test(url.pathname);
  if (!isStaticAsset) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
    return response;
  })());
});
