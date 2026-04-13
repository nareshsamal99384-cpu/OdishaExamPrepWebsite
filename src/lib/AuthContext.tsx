import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  hasFullAccess: boolean;
  loginAsAdmin: (adminData: any) => void;
  logout: () => Promise<void>;
  grantFullAccess: () => Promise<void>;
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

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const adminEmails = ['nareshsamal99384@gmail.com', 'odishaexamprep365@gmail.com'];
          const isAuthorizedAdmin = adminEmails.includes(firebaseUser.email || '');

          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Proactively upgrade to admin if authorized but role is currently 'user'
            if (isAuthorizedAdmin && userData.role !== 'admin') {
              const updatedProfile = { ...userData, role: 'admin' };
              await setDoc(doc(db, 'users', firebaseUser.uid), updatedProfile);
              setProfile(updatedProfile);
            } else {
              setProfile(userData);
            }
          } else {
            // Create initial profile
            const newProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
              photoURL: firebaseUser.photoURL,
              role: isAuthorizedAdmin ? 'admin' : 'user',
              hasFullAccess: isAuthorizedAdmin ? true : false,
              purchasedSeries: [],
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
    await signOut(auth);
    setManualAdmin(null);
    localStorage.removeItem('admin_session');
  };

  const isAdmin = profile?.role === 'admin' || manualAdmin?.role === 'admin';
  const hasFullAccess = isAdmin || profile?.hasFullAccess === true;

  const grantFullAccess = async () => {
    if (!user) return;
    const updatedProfile = { ...profile, hasFullAccess: true };
    await setDoc(doc(db, 'users', user.uid), updatedProfile);
    setProfile(updatedProfile);
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
      guestUsage, 
      incrementGuestUsage 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
