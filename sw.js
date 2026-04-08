'use strict';
const STATIC_CACHE = 'stock-static-v1';
const API_CACHE = 'stock-api-v1';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.webapp'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS).catch(e => console.warn('[SW]', e))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(n => n.startsWith('stock-') && n !== STATIC_CACHE && n !== API_CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.hostname.includes('openapi.twse.com.tw') || url.hostname.includes('twse-proxy')) {
    event.respondWith(caches.open(API_CACHE).then(async cache => {
      const cached = await cache.match(event.request);
      const fetchPromise = fetch(event.request).then(r => { if(r.ok) cache.put(event.request, r.clone()); return r; }).catch(() => cached);
      return cached || fetchPromise;
    }));
  } else if (url.origin === location.origin) {
    event.respondWith(caches.match(event.request).then(r => r || fetch(event.request)));
  }
});
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'CLEAR_CACHE') caches.keys().then(names => names.forEach(n => caches.delete(n)));
});
