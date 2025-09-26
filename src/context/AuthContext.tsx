
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import type { AppUser } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  appUser: AppUser | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Mock User Data for Deactivated Auth ---
const mockAppUser: AppUser = {
  uid: 'dev-user',
  email: 'dev@example.com',
  displayName: 'Dev Admin',
  photoURL: '',
  role: 'Admin',
};

const mockUser = {
  uid: 'dev-user',
  email: 'dev@example.com',
  displayName: 'Dev Admin',
  photoURL: '',
} as User;
// -----------------------------------------


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // The original authentication logic is commented out.
  // To re-activate authentication, uncomment the code below and remove the mock implementation.
  
  /*
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        const unsubscribeFirestore = onSnapshot(userDocRef, async (userDocSnap) => {
          if (userDocSnap.exists()) {
            setAppUser(userDocSnap.data() as AppUser);
          } else {
            const newUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: 'Pending',
            };
            await setDoc(userDocRef, newUser);
            setAppUser(newUser);
          }
           setLoading(false);
        });
        
        return () => unsubscribeFirestore();

      } else {
        setUser(null);
        setAppUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google: ", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  */

  // --- Mock Implementation for Deactivated Auth ---
  const value: AuthContextType = {
    user: mockUser,
    loading: false,
    appUser: mockAppUser,
    signInWithGoogle: async () => { console.log('Auth is deactivated.'); },
    logout: async () => { console.log('Auth is deactivated.'); },
  };
  // -----------------------------------------

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
