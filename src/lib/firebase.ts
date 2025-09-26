// Client Firebase re-export for legacy imports expecting '@/lib/firebase'
// Provides named exports: app (firebaseApp), auth, db (firestore)
// and a helper ensureClientFirebase() for on-demand init.

'use client';

import { initializeFirebase } from '@/firebase/initialize';

let _init: ReturnType<typeof initializeFirebase> | null = null;

export function ensureClientFirebase() {
  if (!_init) {
    _init = initializeFirebase();
  }
  return _init;
}

export const { firebaseApp: app, auth, firestore: db } = ensureClientFirebase();

export type { Firestore } from 'firebase/firestore';
