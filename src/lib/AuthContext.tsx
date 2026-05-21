import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { User, createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key'
);

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
  hasAccessTo: (itemId: string) => boolean;
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

    const fetchProfile = async (sessionUser: User) => {
      try {
        // Fetch fresh user data from server to avoid stale metadata in session
        const { data: { user: freshUser }, error: userError } = await supabase.auth.getUser();
        const activeUser = freshUser || sessionUser;

        const adminEmails = ['odishaexamprep365@gmail.com'];
        const isAuthorizedAdmin = adminEmails.includes(activeUser.email || '');

        const meta = activeUser.user_metadata || {};
        let currentRole = isAuthorizedAdmin ? 'admin' : (meta.role || 'user');
        let currentFullAccess = isAuthorizedAdmin || !!meta.hasFullAccess;

        // Sync role in Supabase if mismatched (runs at most once per session)
        if (isAuthorizedAdmin && meta.role !== 'admin') {
          await supabase.auth.updateUser({ data: { role: 'admin', hasFullAccess: true } });
        } else if (!isAuthorizedAdmin && meta.role === 'admin') {
          currentRole = 'user';
          currentFullAccess = false;
          await supabase.auth.updateUser({ data: { role: 'user', hasFullAccess: false } });
        }

        setProfile({
          uid: activeUser.id,
          email: activeUser.email,
          displayName: meta.full_name || meta.displayName || activeUser.email?.split('@')[0],
          photoURL: meta.avatar_url || meta.photoURL,
          role: currentRole,
          hasFullAccess: currentFullAccess,
          purchasedSeries: meta.purchasedSeries || [],
        });
      } catch (error) {
        console.error('fetchProfile error:', error);
      }
    };


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
        fetchProfile(session.user);
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
        fetchProfile(session.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    const updatedProfile = { ...profile, hasFullAccess: true };
    const { error } = await supabase.auth.updateUser({ data: { hasFullAccess: true } });
    
    if (error) {
      console.error("Metadata update failed:", error);
      alert("Payment successful, but we couldn't update your profile automatically. Please contact support.");
    } else {
      setProfile(updatedProfile);
    }
  };

  const unlockItem = async (itemId: string) => {
    if (!user || !profile) return;
    const currentPurchased = profile.purchasedSeries || [];
    if (!currentPurchased.includes(itemId)) {
      const newPurchased = [...currentPurchased, itemId];
      const updatedProfile = { ...profile, purchasedSeries: newPurchased };
      
      const { error } = await supabase.auth.updateUser({ data: { purchasedSeries: newPurchased } });
      
      if (error) {
        console.error("Metadata update failed:", error);
        alert("Payment successful, but we couldn't update your profile automatically. Please contact support.");
      } else {
        setProfile(updatedProfile);
      }
    }
  };

  const hasAccessTo = (itemId: string, examId?: string) => {
    if (isAdmin || profile?.hasFullAccess) return true;
    const purchased = profile?.purchasedSeries || [];
    if (purchased.includes(itemId)) return true;
    if (examId && purchased.includes(`exam_bundle_${examId}`)) return true;
    return false;
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      const activeUser = freshUser || session.user;
      const adminEmails = ['odishaexamprep365@gmail.com'];
      const isAuthorizedAdmin = adminEmails.includes(activeUser.email || '');
      const meta = activeUser.user_metadata || {};
      const currentRole = isAuthorizedAdmin ? 'admin' : (meta.role || 'user');
      const currentFullAccess = isAuthorizedAdmin || !!meta.hasFullAccess;
      setProfile({
        uid: activeUser.id,
        email: activeUser.email,
        displayName: meta.full_name || meta.displayName || activeUser.email?.split('@')[0],
        photoURL: meta.avatar_url || meta.photoURL,
        role: currentRole,
        hasFullAccess: currentFullAccess,
        purchasedSeries: meta.purchasedSeries || [],
      });
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
