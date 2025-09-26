
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import type { AppUser } from '@/lib/types';
import { UserRoles } from '@/lib/validations';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  appUser: AppUser | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen for real-time updates on the user's document
        const unsubscribeFirestore = onSnapshot(userDocRef, async (userDocSnap) => {
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as AppUser;
            // **FIX**: If user exists but has no role, assign one.
            if (!userData.role) {
                const usersCollectionRef = collection(db, 'users');
                const allUsersSnap = await getDocs(usersCollectionRef);
                // If this is the only user in the system, they must be the admin.
                const isFirstUser = allUsersSnap.size === 1;
                const roleToAssign = isFirstUser ? 'Admin' : 'Pending';
                
                await updateDoc(userDocRef, { role: roleToAssign });
                setAppUser({ ...userData, role: roleToAssign });
            } else {
                setAppUser(userData);
            }
          } else {
            // This is a new user signing up.
            const usersCollectionRef = collection(db, 'users');
            const allUsersSnap = await getDocs(usersCollectionRef);
            const isFirstUser = allUsersSnap.empty;

            const newUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: isFirstUser ? 'Admin' : 'Pending',
            };
            await setDoc(userDocRef, newUser);
            setAppUser(newUser);
          }
           setLoading(false);
        });
        
        // Return the firestore listener so it gets cleaned up
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

  const value = { user, loading, appUser, signInWithGoogle, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
