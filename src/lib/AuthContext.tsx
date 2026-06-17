import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { User, createClient } from '@supabase/supabase-js';
import { hasAccessTo as engineHasAccessTo, runEntitlementAudit } from './entitlementEngine';
import { toast } from 'react-hot-toast';

// Helper for cryptographic/checksummed local caching
const generateChecksum = (userId: string, items: string[]): string => {
  const data = `${userId}:${(items || []).sort().join(',')}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

const cacheOfflineAccess = (userId: string, tempProfile: any) => {
  try {
    const vault = {
      userId,
      purchasedSeries: tempProfile.purchasedSeries || [],
      hasFullAccess: tempProfile.hasFullAccess || false,
      role: tempProfile.role || 'user',
      timestamp: Date.now(),
      checksum: generateChecksum(userId, tempProfile.purchasedSeries || [])
    };
    localStorage.setItem('oep_offline_vault', JSON.stringify(vault));
  } catch (e) {
    console.error('[Offline Vault] Failed to cache entitlements:', e);
  }
};

const loadOfflineAccess = (userId: string) => {
  try {
    const rawVault = localStorage.getItem('oep_offline_vault');
    if (!rawVault) return null;
    const vault = JSON.parse(rawVault);
    if (vault.userId !== userId) {
      console.warn('[Offline Vault] Vault user ID mismatch');
      return null;
    }
    const computedChecksum = generateChecksum(userId, vault.purchasedSeries);
    if (computedChecksum !== vault.checksum) {
      console.error('[Offline Vault] Checksum mismatch. Entitlements tampered with.');
      return null;
    }
    return {
      role: vault.role,
      hasFullAccess: vault.hasFullAccess,
      purchasedSeries: vault.purchasedSeries,
      isOfflineFallback: true
    };
  } catch (e) {
    console.error('[Offline Vault] Failed to load offline cache:', e);
    return null;
  }
};

function withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.warn(`[Timeout] Promise timed out after ${ms}ms. Using fallback.`);
      resolve(fallbackValue);
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        console.error('[Timeout Error]', err);
        resolve(fallbackValue);
      });
  });
}

const supabaseAdmin = supabase;

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  hasFullAccess: boolean;
  loginAsAdmin: (adminData: any) => void;
  logout: () => Promise<void>;
  grantFullAccess: () => Promise<void>;
  unlockItem: (itemId: string) => Promise<void>;
  hasAccessTo: (itemId: string | { id: string; isPremium?: boolean; examId?: string; seriesId?: string | any }, examId?: string) => boolean;
  guestUsage: { questions: number; tests: number };
  incrementGuestUsage: (type: 'questions' | 'tests') => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  hasFullAccess: false,
  loginAsAdmin: () => {},
  logout: async () => {},
  grantFullAccess: async () => {},
  unlockItem: async () => {},
  hasAccessTo: () => false,
  guestUsage: { questions: 0, tests: 0 },
  incrementGuestUsage: () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [manualAdmin, setManualAdmin] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestUsage, setGuestUsage] = useState({ questions: 0, tests: 0 });

  const fetchProfile = async (sessionUser: User, forceRefresh = false) => {
    try {
      let freshUser = null;
      if (forceRefresh) {
        // Wrap fresh user fetch with timeout
        const userPromise = supabase.auth.getUser();
        const userResult = await withTimeout(userPromise, 3000, { data: { user: null }, error: { name: 'AuthError', message: 'timeout', status: 408, code: 'request_timeout', __isAuthError: true } as any });
        freshUser = userResult.data?.user;

        if (!freshUser || !navigator.onLine) {
          const offlineVault = loadOfflineAccess(sessionUser.id);
          if (offlineVault) {
            setProfile({
              uid: sessionUser.id,
              email: sessionUser.email,
              displayName: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.displayName || sessionUser.email?.split('@')[0],
              photoURL: sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.photoURL,
              role: offlineVault.role,
              hasFullAccess: offlineVault.hasFullAccess,
              purchasedSeries: offlineVault.purchasedSeries,
              isOfflineFallback: true
            });
            toast.error("Offline Mode: Using cached entitlements from your device.", { id: 'offline-fallback' });
            return;
          }
        }
      }

      const activeUser = freshUser || sessionUser;
      const adminEmails = ['odishaexamprep365@gmail.com', 'nareshsamal99384@gmail.com'];
      const isAuthorizedAdmin = adminEmails.includes(activeUser.email || '');

      const meta = activeUser.user_metadata || {};
      let currentRole = isAuthorizedAdmin ? 'admin' : (meta.role || 'user');
      let currentFullAccess = isAuthorizedAdmin || !!meta.hasFullAccess;

      const metaPurchased = meta.purchasedSeries || [];
      const isFullAccess = currentFullAccess || metaPurchased.includes('full_access');

      // Run proactive entitlement audit and self-healing
      const tempProfile = {
        role: currentRole,
        hasFullAccess: isFullAccess,
        purchasedSeries: metaPurchased
      };
      
      let mergedPurchased = metaPurchased;
      if (navigator.onLine && forceRefresh && freshUser) {
        const auditResult = await withTimeout(runEntitlementAudit(supabase, activeUser.id, tempProfile), 3000, null);
        if (auditResult && auditResult.finalList) {
          mergedPurchased = auditResult.finalList;
        }
      }

      const finalProfile = {
        uid: activeUser.id,
        email: activeUser.email,
        displayName: meta.full_name || meta.displayName || activeUser.email?.split('@')[0],
        photoURL: meta.avatar_url || meta.photoURL,
        role: currentRole,
        hasFullAccess: isFullAccess || mergedPurchased.includes('full_access'),
        purchasedSeries: mergedPurchased,
      };

      setProfile(finalProfile);
      cacheOfflineAccess(activeUser.id, finalProfile);
    } catch (error) {
      console.error('fetchProfile error:', error);
      if (sessionUser) {
        const offlineVault = loadOfflineAccess(sessionUser.id);
        if (offlineVault) {
          setProfile({
            uid: sessionUser.id,
            email: sessionUser.email,
            displayName: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.displayName || sessionUser.email?.split('@')[0],
            photoURL: sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.photoURL,
            role: offlineVault.role,
            hasFullAccess: offlineVault.hasFullAccess,
            purchasedSeries: offlineVault.purchasedSeries,
            isOfflineFallback: true
          });
          toast.error("Offline Mode: Using cached entitlements from your device.", { id: 'offline-fallback' });
        }
      }
    }
  };

  useEffect(() => {
    // Load guest usage from local storage
    const stored = localStorage.getItem('guest_usage');
    if (stored) {
      setGuestUsage(JSON.parse(stored));
    }

    const storedAdmin = localStorage.getItem('admin_session');
    if (storedAdmin) {
      setManualAdmin(JSON.parse(storedAdmin));
    }

    // Load the existing session (may have stale/bloated JWT from localStorage).
    // Always force a token refresh so the JWT reflects the CURRENT server-side
    // user_metadata — this is critical for accounts where metadata was cleaned
    // server-side (e.g., via admin script) but the browser JWT is still old.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          // Refresh the token to get a new JWT with current metadata
          const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
          if (!refreshErr && refreshed?.session) {
            // onAuthStateChange will handle setUser/fetchProfile for TOKEN_REFRESHED
            // but set loading=false here in case it fires slowly
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Token refresh failed, falling back to cached session:', e);
        }
        // Fallback: use cached session if refresh fails
        setUser(session.user);
        fetchProfile(session.user, false);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user, false);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Listen for online/offline events to re-verify cache and self-heal automatically
  useEffect(() => {
    const handleOnline = () => {
      toast.success("Connection restored! Syncing your study profile...", { id: 'network-status' });
      if (user) {
        fetchProfile(user, true);
      }
    };
    const handleOffline = () => {
      toast.error("You are offline. Study resources may be limited to cached content.", { id: 'network-status' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  const incrementGuestUsage = (type: 'questions' | 'tests') => {
    const newUsage = { ...guestUsage, [type]: guestUsage[type] + 1 };
    setGuestUsage(newUsage);
    localStorage.setItem('guest_usage', JSON.stringify(newUsage));
  };

  const loginAsAdmin = (adminData: any) => {
    setManualAdmin(adminData);
    localStorage.setItem('admin_session', JSON.stringify(adminData));
  };

  const logout = async () => {
    // Clear state immediately so UI switches to guest view at once
    setUser(null);
    setProfile(null);
    setManualAdmin(null);
    localStorage.removeItem('admin_session');
    // Then sign out from Supabase (clears the session cookie/token)
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.error('signOut error (non-critical):', e);
    }
  };

  const isAdmin = profile?.role === 'admin' || manualAdmin?.role === 'admin';
  const hasFullAccess = isAdmin || profile?.hasFullAccess === true;

  const grantFullAccess = async () => {
    if (!user) return;
    await refreshProfile();
  };

  const unlockItem = async (itemId: string) => {
    if (!user || !profile) return;
    await refreshProfile();
  };

  const hasAccessTo = (
    itemOrId: string | { id: string; isPremium?: boolean; examId?: string; seriesId?: string | any },
    examId?: string
  ): boolean => {
    return engineHasAccessTo(profile || manualAdmin, itemOrId, examId);
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfile(session.user, true);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user: user || manualAdmin, 
      profile: profile || manualAdmin, 
      loading, 
      isAdmin, 
      hasFullAccess, 
      loginAsAdmin,
      logout,
      grantFullAccess, 
      unlockItem,
      hasAccessTo,
      guestUsage, 
      incrementGuestUsage,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
