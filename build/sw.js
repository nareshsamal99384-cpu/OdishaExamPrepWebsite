// OdishaExamPrep Push Notification Service Worker
// Handles push events and notification clicks even when the site is closed.

const CACHE_NAME = 'oep-push-sw-v1';

// ── Lifecycle ──────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// ── Push Event ─────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'OdishaExamPrep', body: event.data ? event.data.text() : 'New update available!' };
  }

  const {
    title = 'OdishaExamPrep',
    body = 'You have a new notification.',
    icon = '/android-chrome-192x192.png',
    badge = '/favicon-32x32.png',
    image,
    clickUrl = '/',
    data: extraData = {},
    actions = [],
    tag,
    requireInteraction = false,
  } = data;

  const notificationOptions = {
    body,
    icon,
    badge,
    image: image || undefined,
    data: { clickUrl, ...extraData },
    actions: actions.slice(0, 2), // max 2 action buttons
    tag: tag || `oep-${Date.now()}`,
    requireInteraction,
    vibrate: [100, 50, 100],
    timestamp: Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

// ── Notification Click ─────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const clickUrl = event.notification.data?.clickUrl || '/';
  const absoluteUrl = new URL(clickUrl, self.location.origin).href;

  // Handle action button clicks
  if (event.action) {
    const actions = event.notification.actions || [];
    const clickedAction = actions.find(a => a.action === event.action);
    if (clickedAction?.url) {
      event.waitUntil(clients.openWindow(new URL(clickedAction.url, self.location.origin).href));
      return;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if already open
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', url: absoluteUrl });
          return;
        }
      }
      // Otherwise open a new window
      return clients.openWindow(absoluteUrl);
    })
  );
});

// ── Push Subscription Change ───────────────────────────────────────────────
self.addEventListener('pushsubscriptionchange', (event) => {
  // Resubscribe automatically when subscription expires
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
    }).then((newSubscription) => {
      // Notify the app to update the subscription in the database
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_CHANGED',
            subscription: JSON.stringify(newSubscription),
          });
        });
      });
    }).catch(console.error)
  );
});
