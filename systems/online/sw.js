/**
 * VessieOS Service Worker
 * Enables offline functionality and caching
 */

const CACHE_NAME = 'VessieOS-v1';

// Escopo do Service Worker: em GitHub Pages de projeto (usuario.github.io/Repo/)
// caminhos absolutos começando com "/" apontam para a raiz do domínio, não do
// repositório, e quebram o cache. Resolvemos tudo relativo ao próprio sw.js.
const SCOPE = new URL('./', self.location).pathname;
const rel = (path) => SCOPE + path;

const URLS_TO_CACHE = [
  SCOPE,
  rel('index.html'),
  rel('HTML/systems/dashboard.html'),
  rel('CSS/base/responsive.css'),
  rel('JS/kernel/responsive-renderer.js'),
  rel('JS/kernel/lm-studio-ai.js'),
  rel('JS/kernel/windows-executor.js'),
  rel('JS/kernel/module-system.js'),
  rel('JS/kernel/web-content-fetcher.js'),
  rel('JS/kernel/boot-manager.js'),
  rel('JS/kernel/config.js'),
  rel('JS/systems/game-hub-collector.js'),
  rel('systems/discord/integration.js'),
  rel('systems/social/network.js'),
  rel('systems/online/manager.js')
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(URLS_TO_CACHE);
    }).catch((error) => {
      console.log('[SW] Cache setup error:', error);
    })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - Network first, cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external APIs
  if (request.url.includes('discord.com') || request.url.includes('api.github.com')) {
    event.respondWith(fetch(request));
    return;
  }

  // Network first strategy
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const cache = caches.open(CACHE_NAME);
          cache.then((c) => c.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(request).then((response) => {
          return response || createOfflineResponse();
        });
      })
  );
});

// Offline page response
function createOfflineResponse() {
  return new Response(
    `<!DOCTYPE html>
<html>
<head>
  <title>VessieOS - Offline Mode</title>
  <style>
    body {
      font-family: 'Segoe UI', sans-serif;
      background: #090b12;
      color: #f4f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .offline-box {
      text-align: center;
      background: rgba(255, 255, 255, 0.04);
      padding: 40px;
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    h1 { font-size: 2rem; margin-bottom: 10px; }
    p { color: #8a90a0; margin: 10px 0; }
    .status { 
      background: rgba(255, 193, 7, 0.1);
      border: 1px solid rgba(255, 193, 7, 0.3);
      padding: 15px;
      border-radius: 8px;
      margin-top: 20px;
      color: #ffc107;
    }
  </style>
</head>
<body>
  <div class="offline-box">
    <h1>📡 Modo Offline</h1>
    <p>Você está offline, mas VessieOS ainda funciona!</p>
    <p>Sua conexão será restaurada automaticamente.</p>
    <div class="status">
      ✓ Dados em cache disponíveis<br>
      ✓ Aplicação funcional<br>
      ⏳ Aguardando conexão...
    </div>
  </div>
  <script>
    window.addEventListener('online', () => {
      location.reload();
    });
  </script>
</body>
</html>`,
    {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    }
  );
}

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      fetch('/api/sync')
        .then((response) => {
          console.log('[SW] Data synced successfully');
        })
        .catch((error) => {
          console.log('[SW] Sync failed:', error);
        })
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação',
    icon: rel('icon-192x192.png'),
    badge: rel('badge-72x72.png'),
    tag: 'VessieOS-notification'
  };

  event.waitUntil(
    self.registration.showNotification('VessieOS', options)
  );
});

console.log('[Service Worker] Loaded');
