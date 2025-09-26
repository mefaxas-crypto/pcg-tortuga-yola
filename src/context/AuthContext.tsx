
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import type { AppUser } from '@/lib/types';

// --- MOCK USER DATA ---
const mockUser: User = {
  uid: 'dev-admin-user',
  email: 'dev@admin.com',
  displayName: 'Dev Admin',
  photoURL: '',
  providerId: 'password',
  emailVerified: true,
} as User;

const mockAppUser: AppUser = {
  uid: 'dev-admin-user',
  email: 'dev@admin.com',
  displayName: 'Dev Admin',
  photoURL: '',
  role: 'Admin',
};
// ----------------------


interface AuthContextType {
  user: User | null;
  loading: boolean;
  appUser: AppUser | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  
  const value: AuthContextType = {
    user: mockUser,
    loading: false, // Set loading to false
    appUser: mockAppUser, // Provide the mock app user
    signInWithGoogle: async () => { console.log('Auth is deactivated.'); }, // Do nothing
    logout: async () => { console.log('Auth is deactivated.'); }, // Do nothing
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
