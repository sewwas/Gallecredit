const CACHE_NAME = 'gallecredit-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/logo.jpg'
];

// Install: pre-cache static app shell safely
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[SW] Pre-cache failed for asset:', asset, err);
        }
      }
    })
  );
  self.skipWaiting();
});

// Activate: clean up outdated caches and take immediate control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event listener
self.addEventListener('fetch', (event) => {
  // Only handle HTTP/HTTPS requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Only GET requests can be matched or cached by CacheStorage
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // 1. Backend API requests: network-first, with graceful offline fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Network unavailable. Running in offline mode.' }),
          { headers: { 'Content-Type': 'application/json' }, status: 503 }
        );
      })
    );
    return;
  }

  // 2. Navigation requests (SPA page routes like /vaults, /collector, /loans):
  // Network first; if 404 or offline, serve index.html from cache or fallback response
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request);
          // If server responded with 404 for a deep SPA route, fallback to index.html
          if (networkResponse && networkResponse.status === 404) {
            const cachedIndex = await caches.match('/index.html') || await caches.match('/');
            if (cachedIndex) {
              return cachedIndex;
            }
          }
          if (networkResponse) {
            return networkResponse;
          }
        } catch (err) {
          console.warn('[SW] Navigation fetch failed, falling back to cache:', err);
        }

        // Offline / network failure: return cached app shell
        const cached = await caches.match('/index.html') || await caches.match('/');
        if (cached) {
          return cached;
        }

        // Fallback response: ensure event.respondWith never resolves to undefined or rejects
        return new Response(
          '<!doctype html><html><head><meta charset="utf-8"><title>Offline - Galle Credit</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:sans-serif;text-align:center;padding:50px 20px;background:#0f172a;color:#f8fafc;"><h2>You are currently offline</h2><p>Please check your internet connection and reload.</p><button onclick="window.location.reload()" style="background:#2563eb;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:bold;margin-top:16px;">Retry</button></body></html>',
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          }
        );
      })()
    );
    return;
  }

  // 3. Static assets on the same origin: Stale-while-revalidate with guaranteed response
  if (isSameOrigin) {
    event.respondWith(
      (async () => {
        const cachedResponse = await caches.match(event.request);

        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch((err) => {
            console.warn('[SW] Fetch failed for:', event.request.url, err);
            return null;
          });

        if (cachedResponse) {
          // Trigger background revalidation
          fetchPromise;
          return cachedResponse;
        }

        const networkResponse = await fetchPromise;
        if (networkResponse) {
          return networkResponse;
        }

        // Guaranteed Response fallback: prevent TypeError: Failed to convert value to 'Response'
        return new Response('Resource unavailable offline', {
          status: 404,
          statusText: 'Not Found',
          headers: { 'Content-Type': 'text/plain' }
        });
      })()
    );
    return;
  }
});
