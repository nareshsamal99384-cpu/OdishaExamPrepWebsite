import { useState, useEffect, useCallback } from 'react';
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  getSubscriptionStatus,
  getPermissionState,
  registerServiceWorker,
  isIOS,
  isIOSPWA,
} from '../lib/pushNotifications';

export interface PushNotificationState {
  isSupported: boolean;
  isIOSDevice: boolean;
  isIOSInstalled: boolean; // PWA installed on iOS Home Screen
  isSubscribed: boolean;
  isLoading: boolean;
  permissionState: NotificationPermission;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function usePushNotifications(userId: string | undefined): PushNotificationState {
  const [isSupported] = useState(() => isPushSupported());
  const [isIOSDevice] = useState(() => isIOS());
  const [isIOSInstalled] = useState(() => isIOSPWA());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');

  // Synchronize state with browser/server
  const syncState = useCallback(async () => {
    if (!isSupported || !userId) return;
    try {
      const [perm, subscribed] = await Promise.all([
        getPermissionState(),
        getSubscriptionStatus(),
      ]);
      setPermissionState(perm);
      setIsSubscribed(subscribed);

      // If permission is already granted, automatically register/sync subscription in background
      if (perm === 'granted') {
        const sub = await subscribeToPush(userId);
        if (sub) {
          setIsSubscribed(true);
        }
      }
    } catch (err) {
      console.error('[usePushNotifications] State sync failed:', err);
    }
  }, [isSupported, userId]);

  // Initialize: register SW + check & sync subscription status
  useEffect(() => {
    if (!isSupported || !userId) return;

    let mounted = true;

    const init = async () => {
      // Register service worker on init
      await registerServiceWorker();
      if (mounted) {
        await syncState();
      }
    };

    init();
    return () => { mounted = false; };
  }, [isSupported, userId, syncState]);

  // Synchronize on focus/visibility change and listen to Permissions API
  useEffect(() => {
    if (!isSupported || !userId) return;

    const handleSync = () => {
      syncState();
    };

    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    // Permissions API listener
    let permissionStatus: PermissionStatus | null = null;
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'notifications' as PermissionName })
        .then((status) => {
          permissionStatus = status;
          status.addEventListener('change', handleSync);
        })
        .catch((err) => {
          console.warn('[usePushNotifications] Permissions API query failed:', err);
        });
    }

    return () => {
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
      if (permissionStatus) {
        permissionStatus.removeEventListener('change', handleSync);
      }
    };
  }, [isSupported, userId, syncState]);

  // Listen for subscription change messages from service worker
  useEffect(() => {
    if (!isSupported || !userId) return;

    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED') {
        // Re-sync subscription to server
        const subscribed = await getSubscriptionStatus();
        setIsSubscribed(subscribed);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleMessage);
  }, [isSupported, userId]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    setIsLoading(true);
    try {
      const sub = await subscribeToPush(userId);
      const perm = await getPermissionState();
      setPermissionState(perm);
      if (sub) {
        setIsSubscribed(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[usePushNotifications] Subscribe error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    setIsLoading(true);
    try {
      const success = await unsubscribeFromPush(userId);
      if (success) {
        setIsSubscribed(false);
      }
      return success;
    } catch (err) {
      console.error('[usePushNotifications] Unsubscribe error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    const [perm, subscribed] = await Promise.all([
      getPermissionState(),
      getSubscriptionStatus(),
    ]);
    setPermissionState(perm);
    setIsSubscribed(subscribed);
  }, []);

  return {
    isSupported,
    isIOSDevice,
    isIOSInstalled,
    isSubscribed,
    isLoading,
    permissionState,
    subscribe,
    unsubscribe,
    refresh,
  };
}
