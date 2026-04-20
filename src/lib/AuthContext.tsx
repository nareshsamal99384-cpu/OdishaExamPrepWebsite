import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

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
        const { data: userDoc, error } = await supabase
          .from('users')
          .select('*')
          .eq('uid', sessionUser.id)
          .single();

        const adminEmails = ['odishaexamprep365@gmail.com'];
        const isAuthorizedAdmin = adminEmails.includes(sessionUser.email || '');

        if (userDoc) {
          // Proactively upgrade to admin if authorized but role is currently 'user'
          if (isAuthorizedAdmin && userDoc.role !== 'admin') {
            const updatedProfile = { ...userDoc, role: 'admin' };
            await supabase.from('users').update({ role: 'admin' }).eq('uid', sessionUser.id);
            setProfile(updatedProfile);
          } else if (!isAuthorizedAdmin && userDoc.role === 'admin') {
            // Force downgrade previously authorized admins who are no longer on the list
            const updatedProfile = { ...userDoc, role: 'user' };
            await supabase.from('users').update({ role: 'user' }).eq('uid', sessionUser.id);
            setProfile(updatedProfile);
          } else {
            setProfile(userDoc);
          }
        } else {
          // Create initial profile
          const newProfile = {
            uid: sessionUser.id,
            email: sessionUser.email,
            displayName: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0],
            photoURL: sessionUser.user_metadata?.avatar_url,
            role: isAuthorizedAdmin ? 'admin' : 'user',
            hasFullAccess: isAuthorizedAdmin ? true : false,
            purchasedSeries: [],
          };
          
          await supabase.from('users').insert([newProfile]);
          setProfile(newProfile);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Listen for auth changes
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
    await supabase.auth.signOut();
    setManualAdmin(null);
    localStorage.removeItem('admin_session');
  };

  const isAdmin = profile?.role === 'admin' || manualAdmin?.role === 'admin';
  const hasFullAccess = isAdmin || profile?.hasFullAccess === true;

  const grantFullAccess = async () => {
    if (!user) return;
    const updatedProfile = { ...profile, hasFullAccess: true };
    await supabase.from('users').update({ hasFullAccess: true }).eq('uid', user.id);
    setProfile(updatedProfile);
  };

  const unlockItem = async (itemId: string) => {
    if (!user || !profile) return;
    const currentPurchased = profile.purchasedSeries || [];
    if (!currentPurchased.includes(itemId)) {
      const newPurchased = [...currentPurchased, itemId];
      const updatedProfile = { ...profile, purchasedSeries: newPurchased };
      await supabase.from('users').update({ purchasedSeries: newPurchased }).eq('uid', user.id);
      setProfile(updatedProfile);
    }
  };

  const hasAccessTo = (itemId: string) => {
    if (isAdmin || profile?.hasFullAccess) return true;
    return (profile?.purchasedSeries || []).includes(itemId);
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
      incrementGuestUsage 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
