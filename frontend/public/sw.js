const CACHE_NAME = 'softius-tasks-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
      );
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(event.data.title || 'Софтиус Задачи', {
      body: event.data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: event.data.tag || `notification-${Date.now()}`,
    });
  }
});

async function fetchWithCredentials(path) {
  try {
    return await fetch(path, { credentials: 'include' });
  } catch {
    return null;
  }
}

async function checkNotifications() {
  const response = await fetchWithCredentials('/api/tasks/notifications');
  if (!response || !response.ok) return;
  const data = await response.json();

  for (const task of data.assigned || []) {
    self.registration.showNotification('Софтиус Задачи', {
      body: `Вам назначена задача: «${task.title}»`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: `assigned-${task.id}`,
    });
  }

  for (const task of data.deadlines || []) {
    const due = new Date(task.deadline);
    const minutes = Math.max(0, Math.round((due.getTime() - Date.now()) / 60000));
    if (minutes <= 60 && minutes > 0) {
      self.registration.showNotification('Софтиус Задачи', {
        body: `Осталось ${minutes} мин. до сдачи «${task.title}». Отметьте прогресс выполнения.`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: `deadline-${task.id}`,
      });
    }
  }
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'deadline-check') {
    event.waitUntil(checkNotifications());
  }
});

setInterval(checkNotifications, 60 * 1000);
