const CACHE_VERSION = 'v4';
const STATIC_CACHE_NAME = `et-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `et-dynamic-${CACHE_VERSION}`;
const MAX_DYNAMIC_ITEMS = 50; // Prevent unnecessary cache growth

const ASSETS_TO_PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap'
];

// Helper to limit cache size dynamically
const limitCacheSize = async (cacheName, maxItems) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await limitCacheSize(cacheName, maxItems);
  }
};

// Install Event - Pre-cache essential app shell and external assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Pre-caching static offline assets');
        return cache.addAll(ASSETS_TO_PRECACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up any stale old caches automatically
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Handle intelligent offline routing & caching strategies
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Ignore non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // 1. Navigation requests (HTML page): Network First with Cache Fallback for complete offline usage
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If network is offline, serve index.html from cache
          return caches.match('./index.html') || caches.match('/') || caches.match('./') || caches.match('/index.html');
        })
    );
    return;
  }

  // 2. Static Assets (local CSS, JS, images, icons, and CDN links)
  const isStaticAsset = 
    requestUrl.origin === self.location.origin ||
    requestUrl.hostname.includes('fonts.googleapis.com') ||
    requestUrl.hostname.includes('fonts.gstatic.com') ||
    requestUrl.hostname.includes('cdn.tailwindcss.com') ||
    requestUrl.hostname.includes('cdn.jsdelivr.net');

  if (isStaticAsset) {
    // Cache First Strategy
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Fetch from network, cache dynamically, and return
        return fetch(event.request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
            limitCacheSize(DYNAMIC_CACHE_NAME, MAX_DYNAMIC_ITEMS);
          });

          return networkResponse;
        }).catch(err => {
          console.warn('[Service Worker] Fetch failed for offline asset:', event.request.url, err);
          if (event.request.destination === 'image') {
            return caches.match('./icon-192.png');
          }
        });
      })
    );
    return;
  }

  // 3. All other dynamic resources (Dynamic First / Network First)
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
            limitCacheSize(DYNAMIC_CACHE_NAME, MAX_DYNAMIC_ITEMS);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
