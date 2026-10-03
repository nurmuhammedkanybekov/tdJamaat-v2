// tdJamaat service worker — makes the site installable and fast to open.
//
//  - Page (navigation): network first, so everyone always gets the latest
//    version when online; the cached copy is only used offline.
//  - Built assets (/assets/*, hashed file names) and fonts/icons: cache
//    first — their names change on every deploy, so a cached copy is never
//    stale.
//  - Supabase (the data) is never cached here: scores must always be live.
const CACHE = 'tdjamaat-v2';
const SHELL = ['/', '/favicon.svg', '/manifest.webmanifest'];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return; // Supabase, external links: straight to network
    if (url.pathname.startsWith('/api/')) return;

    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then(res => {
                    const copy = res.clone();
                    caches.open(CACHE).then(cache => cache.put('/', copy));
                    return res;
                })
                .catch(() => caches.match('/'))
        );
        return;
    }

    event.respondWith(
        caches.match(req).then(hit => hit || fetch(req).then(res => {
            if (res.ok && (url.pathname.startsWith('/assets/') || /\.(svg|png|woff2?|webmanifest)$/.test(url.pathname))) {
                const copy = res.clone();
                caches.open(CACHE).then(cache => cache.put(req, copy));
            }
            return res;
        }))
    );
});
