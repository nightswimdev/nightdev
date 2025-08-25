importScripts('/active/uv/uv.bundle.js');
importScripts('/active/uv/uv.config.js');
importScripts('/active/uv/uv.sw.js');

const sw = new UVServiceWorker();

self.addEventListener('fetch', event => {
    const url = event.request.url;
    const prefix = self.location.origin + __uv$config.prefix;
    
    if (url.startsWith(prefix)) {
        event.respondWith(
            sw.fetch(event).catch(error => {
                console.error('SW: UV fetch failed:', error);
                return new Response('Service Worker Error: ' + error.message, {
                    status: 500,
                    statusText: 'Service Worker Error'
                });
            })
        );
    }
});

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});