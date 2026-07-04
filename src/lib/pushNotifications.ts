/**
 * OdishaExamPrep Push Notification Utility
 * Handles service worker registration, permission requests, and subscription management.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

// ── Feature Detection ───────────────────────────────────────────────────────
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function isIOS(): boolean {
  return /iP(hone|od|ad)/.test(navigator.userAgent);
}

export function isIOSPWA(): boolean {
  return isIOS() && (window.navigator as any).standalone === true;
}

// ── Permission ─────────────────────────────────────────────────────────────
export async function getPermissionState(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

// ── Service Worker ─────────────────────────────────────────────────────────
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (err) {
    console.error('[PushNotifications] Service worker registration failed:', err);
    return null;
  }
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return registration || null;
  } catch {
    return null;
  }
}

// ── VAPID Key Encoding ─────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ── Subscribe ──────────────────────────────────────────────────────────────
export async function subscribeToPush(userId: string): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.warn('[PushNotifications] Push not supported in this browser.');
    return null;
  }

  const permission = await requestPermission();
  if (permission !== 'granted') {
    console.warn('[PushNotifications] Permission not granted:', permission);
    return null;
  }

  let reg = await getServiceWorkerRegistration();
  if (!reg) {
    reg = await registerServiceWorker();
  }
  if (!reg) return null;

  // Wait for SW to be active
  await navigator.serviceWorker.ready;

  try {
    // Check for existing subscription
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      if (!VAPID_PUBLIC_KEY) {
        console.error('[PushNotifications] VITE_VAPID_PUBLIC_KEY is not set.');
        return null;
      }
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // Save to server
    await saveSubscriptionToServer(userId, subscription);
    return subscription;
  } catch (err) {
    console.error('[PushNotifications] Subscription failed:', err);
    return null;
  }
}

// ── Unsubscribe ────────────────────────────────────────────────────────────
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    const reg = await getServiceWorkerRegistration();
    if (!reg) return true;

    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return true;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await removeSubscriptionFromServer(userId, endpoint);
    return true;
  } catch (err) {
    console.error('[PushNotifications] Unsubscribe failed:', err);
    return false;
  }
}

// ── Check current subscription status ─────────────────────────────────────
export async function getSubscriptionStatus(): Promise<boolean> {
  try {
    if (!isPushSupported()) return false;
    const reg = await navigator.serviceWorker.ready;
    if (!reg) return false;
    const subscription = await reg.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

// ── Server API calls ───────────────────────────────────────────────────────
async function saveSubscriptionToServer(userId: string, subscription: PushSubscription): Promise<void> {
  const key = subscription.getKey('p256dh');
  const auth = subscription.getKey('auth');

  const body = {
    userId,
    endpoint: subscription.endpoint,
    p256dh: key ? btoa(String.fromCharCode(...new Uint8Array(key))) : '',
    auth: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : '',
    deviceInfo: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
    },
  };

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to save subscription: ${err}`);
  }
}

async function removeSubscriptionFromServer(userId: string, endpoint: string): Promise<void> {
  await fetch('/api/push/unsubscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, endpoint }),
  });
}
