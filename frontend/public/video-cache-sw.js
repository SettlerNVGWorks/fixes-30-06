// Video Cache Service Worker
const CACHE_NAME = 'video-cache-v1';
const VIDEO_CACHE = 'video-cache';

// Cache video files aggressively
self.addEventListener('install', function(event) {
  console.log('🚀 Video cache service worker installing...');
  event.waitUntil(
    caches.open(VIDEO_CACHE).then(function(cache) {
      console.log('📹 Video cache opened');
      // Pre-cache the main video
      return cache.addAll([
        '/static/media/main-vid.mp4'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('✅ Video cache service worker activated');
  event.waitUntil(self.clients.claim());
});

// Intercept video requests
self.addEventListener('fetch', function(event) {
  // Only handle video requests
  if (event.request.url.includes('.mp4') || event.request.url.includes('main-vid')) {
    event.respondWith(
      caches.open(VIDEO_CACHE).then(function(cache) {
        return cache.match(event.request).then(function(response) {
          if (response) {
            console.log('🎬 Video served from cache:', event.request.url);
            return response;
          }
          
          console.log('📥 Video not in cache, fetching:', event.request.url);
          return fetch(event.request).then(function(response) {
            // Cache the video for next time
            if (response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        });
      })
    );
  }
});