const CACHE_NAME = 'sabilore-v44'; 



const STATIC_ASSETS = [
    '/css/style.min.css?v=2026_v44',
    '/js/main.min.js?v=2026_v44',
    '/js/tracking.min.js?v=2026_v44',
    '/offline.html',
];


self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS).catch(e => console.warn('SW Install Warn:', e)))
    );
    self.skipWaiting();
});


self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(names =>
            Promise.all(names
                .filter(n => n !== CACHE_NAME && n !== API_CACHE)
                .map(n => caches.delete(n)))
        )
    );
    self.clients.claim();
});


self.addEventListener('fetch', event => {
    const { request } = event;
    const url = request.url;

    
    
    
    if (request.method !== 'GET') return;
    if (url.includes('/admin/')) return;
    if (request.headers.get('range')) return; 

    
    
    
    
    
    if (url.includes('/css/') || url.includes('/js/') || url.includes('.woff') || url.includes('.woff2')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache =>
                cache.match(request).then(cached => {
                    if (cached) return cached;
                    return fetch(request).then(res => {
                        if (res && res.status === 200) cache.put(request, res.clone());
                        return res;
                    }).catch(() => caches.match('/offline.html'));
                })
            )
        );
        return;
    }

    
    
    
    
    if (url.includes('/img/') || url.includes('/uploads/')) {
        event.respondWith(
            fetch(request)
                .then(res => {
                    if (res && res.status === 200) {
                        const resClone = res.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, resClone));
                    }
                    return res;
                })
                .catch(() => caches.open(CACHE_NAME).then(cache => cache.match(request)))
        );
        return;
    }

    
    
    if (url.includes('/api/')) {
        return; 
    }

    
    event.respondWith(
        fetch(request)
            .then(res => {
                if (res && res.status === 200 && res.headers.get('content-type')?.includes('text/html')) {
                    const resClone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(request, resClone));
                }
                return res;
            })
            .catch(() =>
                caches.match(request).then(cached => cached || caches.match('/offline.html'))
            )
    );
});
