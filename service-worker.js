// Cache name
const CACHE_NAME = 'autodca-v1';

// Files to cache
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
  '/manifest.json'
];

// Install service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch cached resources
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Push notifications
self.addEventListener('push', event => {
  const data = event.data.json();
  const title = 'AutoDCA Notification';
  
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.message,
      icon: '/icons/icon-192x192.png'
    })
  );
});