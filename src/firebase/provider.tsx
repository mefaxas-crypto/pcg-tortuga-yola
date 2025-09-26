
'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { type FirebaseApp } from 'firebase/app';
import { type Auth } from 'firebase/auth';
import { type Firestore } from 'firebase/firestore';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// Define the shape of the context
interface FirebaseContextType {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

// Create the context
const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

// Define the props for the provider
interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

export const FirebaseProvider = ({ children, firebaseApp, auth, firestore }: FirebaseProviderProps) => {
  // The services are now passed in as props, already initialized.
  const value = useMemo(() => ({
    firebaseApp,
    auth,
    firestore,
  }), [firebaseApp, auth, firestore]); 

  return (
    <FirebaseContext.Provider value={value}>
      {children}
      <FirebaseErrorListener />
    </FirebaseContext.Provider>
  );
};

// Custom hook to easily access the Firebase context
export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
