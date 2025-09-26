
'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore, initializeFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

// Define the shape of the services object
interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

/**
 * Initializes and returns the Firebase services.
 * This function handles both client-side and server-side initialization,
 * ensuring that services are created only once.
 */
export const initializeFirebase = (): FirebaseServices => {
  if (!getApps().length) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
      // To avoid issues with hot-reloading and multiple initializations, we
      // check if the services are already initialized.
      auth = getAuth(firebaseApp);
      // Using initializeFirestore to handle experimental features if needed
      firestore = initializeFirestore(firebaseApp, {
        ignoreUndefinedProperties: true,
      });
    } catch (error) {
      console.error("Firebase initialization error:", error);
      throw new Error("Failed to initialize Firebase. Check your configuration.");
    }
  } else {
    firebaseApp = getApps()[0];
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);
  }

  return { firebaseApp, auth, firestore };
};
